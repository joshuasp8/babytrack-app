# AI Agent Context

This file provides context for AI agents working on this codebase.

## Project Summary

BabyTrack is a Go REST API for tracking baby feeding events.
State is persisted in **Postgres**. The application runs migrations on startup.

## Key Locations

-   **Entry Point**: `cmd/main.go` - Wires up dependencies, runs migrations, implements graceful shutdown.
-   **Domain Logic**: `internal/feed/` - Handlers, service, repository, and models for the Feed domain.
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

## Feed Domain (`internal/feed/`)

All feed data is **user-scoped**: every query and mutation is filtered by `user_id` derived from the JWT claims.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/feeds` | List all feeds for the authenticated user |
| `GET` | `/api/v1/feeds/{id}` | Get a single feed |
| `POST` | `/api/v1/feeds` | Create a new feed |
| `PUT` | `/api/v1/feeds/{id}` | Update a feed |
| `DELETE` | `/api/v1/feeds/{id}` | Delete a feed |
| `POST` | `/api/v1/feeds/import` | Bulk import from localStorage (idempotent upsert) |

### Feed Types & Validation
-   `type`: must be `breast`, `bottle`, or `formula` (enforced in service layer).
-   `breastSideStartedOn`: must be `left`, `right`, or `null`.

### Adding a New Field to Feed

1.  Create a new migration file in `migrations/` to alter the table.
2.  Update `Feed` struct in `internal/feed/model.go`.
3.  Update `CreateFeedRequest` / `UpdateFeedRequest` / `ImportFeedItem` in `internal/feed/model.go`.
4.  Update `Repository` SQL queries in `internal/feed/repository.go`.
5.  Update `Service` validation if needed in `internal/feed/service.go`.

## Common Tasks

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
    feedRouter := handler.Router(
        middleware.CorsMiddleware(cfg.CorsAllowedOrigins),
        middleware.AuthCookieMiddleware(jwtAuthenticator, cfg.AuthCookieName),
        middleware.NewCustomMiddleware(), // Add here
    )
    ```

### Adding a New Endpoint

1.  Add the handler method in `internal/feed/handler.go`.
2.  Register the route in the `Router()` method within `internal/feed/handler.go`.
    ```go
    // Example:
    router.Get("/api/v1/feeds/stats", this.statsHandler)
    ```

## Testing

-   **Unit Tests**: `internal/feed/handler_test.go` covers handler logic using the `InMemoryRepository`.
-   **Run all tests**:
    ```bash
    go test ./...
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
