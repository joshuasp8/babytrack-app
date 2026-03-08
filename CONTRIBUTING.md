# Contributing to BabyTrack API

Thank you for your interest in contributing!

## Project Overview

BabyTrack is a full-stack infant stats tracker. The Go backend serves a REST API with Postgres persistence, and the Lit-based frontend is embedded in the binary via `//go:embed`. Both live in this monorepo. The project follows a clean architecture pattern to separate concerns and make the code testable and maintainable.

### Architecture

The application is structured in layers:

1.  **Transport Layer**: HTTP handlers (`internal/feed/handler.go`, `internal/health/`, `internal/version/`)
2.  **Middleware Layer**: Request processing pipeline (`pkg/middleware/`)
    - Recovery (panic handling)
    - Request ID (tracing)
    - Logger (request logging)
    - Rate Limit (IP-based request throttling)
    - CORS (cross-origin)
    - Auth (JWT validation)
3.  **Service Layer**: Business logic and validation (`internal/feed/service.go`)
4.  **Repository Layer**: Data access (`internal/feed/repository.go`)
5.  **Auth Layer**: JWT authentication (`pkg/auth/`)
6.  **Config Layer**: Configuration management (`internal/config/`)

## Development Workflow

1.  **Clone the repository**.
2.  **Setup Environment**:
    -   Copy `.env.template` to `.env`.
    -   Ensure Docker is running.
    -   Run `./scripts/bootstrap.sh` to start Postgres and create the database.
    -   **Authentication**: Obtain a valid JWT and place it in `cookies.txt` if one does not already exist (see `scripts/cookies.txt.template`) to run local verification.
3.  **Make your changes**. Please ensure your code follows standard Go formatting (`go fmt`).
4.  **Run Tests**:
    -   Note: Handlers require an authenticated user in the context. See `internal/feed/handler_test.go` for examples of how to mock this.
    ```bash
    go test -v ./...
    ```
5.  **Verify**: Manually verify the changes using `curl` or the dev server.

## Frontend Development

The frontend is built with **Lit** (a lightweight web component library) and ES6 Modules. It lives in `frontend/`.

- **No Build Step**: The code is standard ES6+ and runs directly in modern browsers using an import map for vendor dependencies (like Lit).
- **Testing**: Run `npm test` in the `frontend/` directory (requires Node.js). Tests use the Node.js native test runner with mocked browser APIs.
- **Standalone Mode**: You can run the frontend in isolation using `./frontend/start-server` (served on port 8000). Use `go run cmd/main.go` to test the embedded integration.

### Frontend Architecture & Coding Standards

-   **No Heavy Frameworks**: Lit for reactivity, no React/Angular/build steps.
-   **Premium Aesthetics**: Dark mode default. Use the defined CSS variables in `src/styles/main.css`.
-   **Shadow DOM + Shared Styles**: Components use Shadow DOM for encapsulation. Common tokens are CSS Variables defined in `main.css`; common utility classes (`.btn`, `.input`) live in `src/styles/shared-styles.js` and are imported via `static styles = [sharedStyles, css\`...\`]`.
-   **Logic Separation**: Business logic in `src/services/`, UI logic in `src/components/`.
-   **State Management**: Parent (`bt-app`) orchestrates state via services; children emit custom events (e.g., `feed-added`), parent updates and passes data back down via properties.
-   **Render Decomposition**: Break complex `render()` methods into small helpers (e.g., `_renderHeader()`, `_renderForm()`).
-   **Reusable Components**: Build self-contained, portable components. Compose internally (e.g., `<login-modal>` inside `<profile-icon>`). Use custom events for communication and properties for configuration.

### Local Authentication

For API development without generating real JWTs, you can enable the **Dev Auth Middleware**:

```bash
DEV_AUTH_ENABLED=true go run cmd/main.go
```

This injects a dummy user (`dev@example.com`) into the request context, allowing you to interact with the API effortlessly.

### Adding New Middleware

1.  Create a new file in `pkg/middleware/` (e.g., `rate_limit.go`)
2.  Implement a function returning `func(http.Handler) http.Handler`
3.  Register it in `cmd/main.go` in the appropriate position:
    - **Before Recovery**: Never (Recovery must be first)
    - **After Recovery, before RequestID**: For middleware that doesn't need request IDs
    - **After RequestID, before Logger**: For middleware that should be logged
    - **After Logger**: For route-specific middleware (e.g., Auth, CORS)

### Middleware Order

The middleware stack is applied in this order:
1. Recovery → 2. RequestID → 3. Logger → 4. RateLimit → 5. CORS/Auth (route-specific)

## Configuration

Configuration is managed in `internal/config/`:
- Add new fields to the `Config` struct
- Update `Load()` to read from environment variables
- Add validation in `Validate()` if the field is required

```go
// internal/config/config.go
type Config struct {
    NewField string
}

func (c *Config) Validate() error {
    if c.NewField == "" {
        return fmt.Errorf("NEW_FIELD is required")
    }
    return nil
}
```

## Database Migrations

If you need to change the database schema:

1.  Create a new migration file in `migrations/` (e.g. `0002_add_column.up.sql`).
2.  Restart the application to apply migrations.

## Coding Standards

### Backend (Go)
-   Use `gofmt` to format your code.
-   Keep handler logic simple; move complex business logic to the service layer.
-   Ensure new features have corresponding unit tests.
-   All data access must be user-scoped: always filter queries by `user_id`.

### Frontend (JavaScript)
-   Use explicit, descriptive names for classes, variables, and files. Avoid abbreviations.
-   Keep business logic in `src/services/` and UI logic in `src/components/`.
-   Extract SVG icons into `src/components/common/icons.js`.
-   Run `npm test` in `frontend/` after changes.
