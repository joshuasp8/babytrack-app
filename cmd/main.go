package main

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	embeddings "babytrack"
	"babytrack/internal/config"
	"babytrack/internal/health"
	"babytrack/internal/todo"
	"babytrack/internal/version"
	"babytrack/pkg/auth"
	"babytrack/pkg/middleware"
	"babytrack/pkg/migration"
	"babytrack/pkg/router"
)

func main() {
	// Load and validate configuration
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatal("Configuration validation failed: ", err.Error())
	}

	// Run migrations (if any)
	if err := migration.MigrateDBPostgres(cfg.DBConnectionUrl); err != nil {
		log.Fatal("Failed attempting to run migrations: ", err.Error())
	}

	// Init app db connection
	db, err := sql.Open("postgres", cfg.DBConnectionUrl)
	if err != nil {
		log.Fatal("Failed attempting to open database: ", err.Error())
	}
	defer db.Close()

	// Configure database connection pool
	db.SetMaxOpenConns(cfg.DBMaxOpenConns)
	db.SetMaxIdleConns(cfg.DBMaxIdleConns)
	lifetime, err := time.ParseDuration(cfg.DBConnMaxLifetime)
	if err != nil {
		log.Fatal("Failed attempting to parse DB_CONN_MAX_LIFETIME: ", err.Error())
	}
	db.SetConnMaxLifetime(lifetime)

	// Wire up dependencies
	jwtAuthenticator, err := auth.NewJwtAuthenticator(cfg.JwtPublicKeyBase64)
	if err != nil {
		log.Fatal("Failed attempting to create JWT authenticator: ", err.Error())
	}

	repository := todo.NewPostgresRepository(db)
	service := todo.NewService(repository)
	todoHandler := todo.NewHttpHandler(service)

	var authMiddleware func(http.Handler) http.Handler
	if cfg.DevAuthEnabled {
		log.Println("⚠️  Dev Auth Enabled: Bypassing real authentication")
		authMiddleware = middleware.DevAuthMiddleware()
	} else {
		authMiddleware = middleware.AuthCookieMiddleware(jwtAuthenticator, cfg.AuthCookieName)
	}

	// Create main router with auth middleware
	todoRouter := todoHandler.Router(
		// Middleware stack for authenticated routes
		middleware.CorsMiddleware(cfg.CorsAllowedOrigins),
		authMiddleware,
	)

	// Create root router with global middleware
	// Order: Recovery -> RequestID -> Logger -> RateLimit (applied to all routes)
	rootRouter := router.NewRouter(
		middleware.RecoveryMiddleware(),
		middleware.RequestIDMiddleware(),
		middleware.LoggerMiddleware(),
		middleware.NewRateLimitMiddleware(50, time.Minute), // Simple rate limit: 50 req/min per IP
	)

	// Public routes (no auth required)
	rootRouter.Get("/api/v1/health", health.NewHealthHandler(db))
	rootRouter.Get("/api/v1/version", version.NewVersionHandler())

	// Mount authenticated todo routes under /api/ precedence
	// Note: todoRouter routes are absolute (/api/v1/...), so mounting at /api/ ensures they are matched
	// and take precedence over the root file server.
	rootRouter.Handle("/api/", todoRouter)

	// Serve frontend static files
	// Use embedded filesystem
	frontendFS, err := fs.Sub(embeddings.EmbeddedFrontend, "frontend")
	if err != nil {
		log.Fatal("Failed to create frontend file system: ", err)
	}
	fs := http.FileServer(http.FS(frontendFS))
	rootRouter.Handle("/", fs)

	// Create server with sane timeouts
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      rootRouter,
		ReadTimeout:  5 * time.Second,   // Max time to read request headers/body
		WriteTimeout: 10 * time.Second,  // Max time to write response
		IdleTimeout:  120 * time.Second, // Max time for keep-alive connections
	}

	// Start server in goroutine
	go func() {
		fmt.Println("Server starting on port " + server.Addr + "...")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Allow for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit // blocks here until a signal is receieved

	log.Println("Server shutting down gracefully...")

	// Give outstanding requests 10 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped")
}
