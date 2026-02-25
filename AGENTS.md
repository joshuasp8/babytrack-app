# AI Agent Context

This file provides context for AI agents working on this codebase.

## Project Summary

A simple, clean-architecture Go REST API for managing Todos.
State is persisted in **Postgres**. The application runs migrations on startup.

## Key Locations

-   **Entry Point**: `cmd/main.go` - Wires up dependencies, runs migrations, implements graceful shutdown.
-   **Domain Logic**: `internal/todo/` - Handlers, service, repository, models for Todo domain.
-   **Frontend**: `frontend/` - Vanilla JS / Web Components application.
-   **Health & Version**: `internal/health/`, `internal/version/` - Health check and version endpoints.
-   **Authentication**: `pkg/auth/` - JWT token validation and user claims.
-   **Configuration**: `internal/config/` - Centralized config loading and validation.
-   **Middleware**: `pkg/middleware/`
    -   `recovery.go`: Panic recovery (prevents crashes).
    -   `request_id.go`: Request ID generation and tracking.
    -   `logger.go`: HTTP request logging with status, duration, request ID.
    -   `rate_limit.go`: Simple in-memory IP-based rate limiting.
    -   `cors.go`: CORS configuration.
    -   `auth.go`: JWT cookie authentication middleware.
-   **Router**: `pkg/router/` - Custom router wrapper.
-   **Migrations**: `migrations/` - SQL migration files.
-   **Deploy**: `deploy/` - Configuration for VPS deployment (`docker-compose.yml`, environment templates, and `deploy-local.sh` script).
-   **Scripts**: `scripts/` - Database management and verification scripts.

## Authentication

Authentication is handled via a JWT in an HTTP-only cookie.
-   **Auth Package**: `pkg/auth/` contains `JwtAuthenticator` and `UserClaims`.
-   **Context Key**: `middleware.UserKey` holds the `auth.UserClaims`.
-   **Accessing User**: Use `r.Context().Value(middleware.UserKey).(*auth.UserClaims)` in handlers.
-   **Dev Mode**: If `DEV_AUTH_ENABLED=true`, `middleware.DevAuthMiddleware` is used instead of JWT auth, injecting a dummy user.

## Middleware Stack

Middleware is applied in this order:
1. **Recovery** - Catches panics, prevents crashes
2. **RequestID** - Propagates upstream `X-Request-ID` or generates a new one
3. **Logger** - Logs requests with status, duration, request ID
4. **RateLimit** - Simple in-memory IP-based rate limiting
5. **CORS** - Cross-origin resource sharing (on auth routes)
6. **Auth** - JWT validation (on protected routes)

Public routes (`/health`, `/version`) bypass the auth middleware.

## Frontend Architecture

-   **Tech Stack**: Lit Web Components (`LitElement`), Vanilla ES6 Modules for models (JSDoc typed), CSS Variables. No build step (uses import maps).
-   **Serving**: Frontend assets are embedded in the Go binary using `//go:embed` and served via `http.FileServer` mounted at `/`.
-   **API Integration**: `frontend/services/api.js` handles `fetch` calls to `/api/v1/` and maps responses to native ES6 classes.
-   **Component Model**: 
    -   `<todo-app>`: Main container and state manager (`LitElement`).
    -   `<todo-item>`: Individual item with scoped Lit styles (`LitElement`).

## Common Tasks

### Adding a New Field to Todo

1.  Create a new migration file in `migrations/` to alter the table.
2.  Update `Todo` struct in `internal/todo/model.go`.
3.  Update `CreateTodoRequest` / `UpdateTodoRequest` in `internal/todo/handler.go` if input is needed.
4.  Update `Service` (if needed) and `Repository` (SQL queries) logic.

### Adding Middleware

1.  Create a new file in `pkg/middleware/` (e.g., `rate_limit.go`).
2.  Implement a function returning `func(http.Handler) http.Handler`.
3.  Register it in `cmd/main.go` in the appropriate order:
    - **Global middleware** (applies to all routes): Add to the root handler stack
    - **Route-specific middleware**: Add to the route's Router() call
    ```go
    // Global middleware (all routes) - passed to root router constructor
    rootRouter := router.NewRouter(
        middleware.RecoveryMiddleware(),
        middleware.RequestIDMiddleware(),
        middleware.NewRateLimitMiddleware(), // Add here
        middleware.LoggerMiddleware(),
    )
    
    // Route-specific (authenticated routes only)
    todoRouter := handler.Router(
        middleware.CorsMiddleware(cfg.CorsAllowedOrigins),
        middleware.AuthCookieMiddleware(jwtAuthenticator, cfg.AuthCookieName),
        middleware.NewCustomMiddleware(), // Add here
    )
    ```

### Adding a New Endpoint

1.  Add the handler method in `internal/todo/handler.go`.
2.  Register the route in the `Router()` method within `internal/todo/handler.go`.
    ```go
    // Example:
    router.Get("/todos/new-route", this.newHandler)
    ```

## Testing

-   **Unit Tests**: `internal/todo/handler_test.go` covers handler logic.
-   **Verification**: Run the verification shell script to test the full flow (Create -> List -> Update -> Delete):

```bash
./scripts/verify.sh
```

## Key Patterns

### Request ID Usage

Get the request ID in any handler:
```go
requestID := middleware.GetRequestID(r)
log.Printf("Processing request %s", requestID)
```

### Config Access

Configuration is validated on startup. Access via:
```go
cfg := config.Load()
if err := cfg.Validate(); err != nil {
    log.Fatal(err)
}
```

### Graceful Shutdown

The server implements graceful shutdown:
- Receives SIGINT/SIGTERM
- Stops accepting new connections
- Waits up to 10 seconds for in-flight requests
- Cleanly exits

## General Instructions

- Always use `go fmt` to format your code.
- Don't modify the `deploy/` directory unless explicitly asked to.
- Don't modify the `.env` file unless explicitly asked to.
