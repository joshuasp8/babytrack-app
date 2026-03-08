# BabyTrack API

A simple proof-of-concept BabyTrack API written in Go.

## Project Structure

This project follows a standard Go project layout:

-   `cmd/`: Main applications for this project.
    -   `main.go`: Entry point for the API server with graceful shutdown support.
-   `internal/`: Private application and library code.
    -   `feed/`: Core Feed domain logic (handlers, service, repository, models).
    -   `health/`: Health check handler with database connectivity test.
    -   `version/`: Version endpoint for deployment tracking.
    -   `config/`: Configuration loading and validation.
-   `pkg/`: Reusable library code.
    -   `auth/`: JWT authentication logic (token validation, user claims).
    -   `middleware/`: HTTP middleware stack (CORS, auth, logging, recovery, request ID).
    -   `httputils/`: HTTP response helpers.
    -   `router/`: Custom router wrapper.
    -   `migration/`: Database migration logic.
-   `migrations/`: SQL migration files.
-   `scripts/`: Helper scripts for development and operations.


## Getting Started

### Prerequisites

-   Go installed on your machine.
-   Docker (for running the Postgres database).

### Running the Server

1.  **Start the Database**:
    Use the provided bootstrap script to start Postgres and create the database.
    ```bash
    ./scripts/bootstrap.sh
    ```

2.  **Configure Environment**:
    Ensure you have a `.env` file with the following variables:
    ```bash
    cp .env.template .env
    ```
    -   `DB_URL`: Postgres connection string.
    -   `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `http://localhost:3000`).
    -   `JWT_PUBLIC_KEY_BASE64`: Base64 encoded RSA public key for verifying JWTs.

3.  **Start the Server**:
    Start the server using `go run`. It will automatically apply any pending migrations.
    ```bash
    go run cmd/main.go
    ```

    To run with **development authentication** (bypassing JWT checks) and a custom port:
    ```bash
    PORT=8081 DEV_AUTH_ENABLED=true go run cmd/main.go
    ```

The server will start listening on `http://localhost:8080` (or your configured port).
The frontend is embedded in the binary and served at the root `/`. Basic API endpoints are under `/api/v1/`.

## Testing

### Unit Tests

Run the included unit tests:

```bash
go test -v ./...
```

### Verification

Authentication is required for all endpoints.
1.  Create a `cookies.txt` file in the root directory if one does not already exist (use `scripts/cookies.txt.template` as a guide).
2.  Add a valid JWT token to the `jscom_auth_token` cookie.
3.  Run the verification script:

```bash
./scripts/verify.sh
```

## Monitoring & Health

### Health Check

The `/health` endpoint provides health status and database connectivity:

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

Returns `503 Service Unavailable` if the database is unreachable.

### Version

The `/version` endpoint shows the deployed version:

```bash
curl http://localhost:8080/version
```

Response (dev build):
```json
{
  "version": "dev-0.0.1"
}
```

In Docker/production builds, `version` and `buildTime` are set automatically via ldflags in the Dockerfile.
Version can also be set manually:
```bash
go build -ldflags "-X babytrack/internal/version.Version=1.0.0" cmd/main.go
```

## Features

- ✅ **REST API** for Todo management (CRUD operations)
- ✅ **Modern Frontend:** Lit-based Web Components and ES6 Modules (served at `/`)
- ✅ **JWT Authentication** via HTTP-only cookies
- ✅ **Request Logging** with request IDs, status codes, and duration
- ✅ **Rate Limiting** via in-memory IP tracking to prevent abuse
- ✅ **Panic Recovery** prevents server crashes
- ✅ **Health Checks** with database connectivity testing
- ✅ **Version Endpoint** for deployment verification
- ✅ **Graceful Shutdown** for zero-downtime deployments
- ✅ **PostgreSQL** persistence with auto-migrations

## Deployment

The application is configured to deploy to a remote VPS using Docker Compose. It can be deployed automatically via GitHub Actions (on push to `main` depending on config), or initiated manually from your local machine.

### Local Deployment

To deploy directly to the VPS from your local development environment:

1.  Ensure you have structured your production environment variables in a `.env` file located at `deploy/.env` (use `deploy/.env.template` as a guide).
2.  Review and adjust (if necessary) the SSH configuration variables at the top of `deploy/deploy-local.sh` (`SSH_HOST`, `SSH_USER`, `SSH_KEY_PATH`).
3.  Run the deployment script:
    ```bash
    ./deploy/deploy-local.sh
    ```
    This script will:
    - Build a Linux ARM64 Docker image locally.
    - Save the image as a tar archive.
    - Transfer the archive, `docker-compose.yml`, and `.env` to the VPS via SCP.
    - Ensure the PostgreSQL database and schema exist on the VPS.
    - Load the image, bring up the services using `docker compose up -d`, and clean up the archive.

## API Endpoints & Sample Payloads

You can use these payloads in Postman or `curl` to interact with the API.

### 1. Create a Todo

*   **URL**: `http://localhost:8080/todos`
*   **Method**: `POST`
*   **Body** (JSON):

    ```json
    {
      "title": "Buy groceries"
    }
    ```

### 2. List Todos

*   **URL**: `http://localhost:8080/todos`
*   **Method**: `GET`

### 3. Update a Todo

Replace `:id` with the ID from the creation response or list.

*   **URL**: `http://localhost:8080/todos/:id`
*   **Method**: `PUT`
*   **Body** (JSON):

    ```json
    {
      "title": "Buy groceries and cook dinner",
      "completed": true
    }
    ```

### 4. Delete a Todo

*   **URL**: `http://localhost:8080/todos/:id`
*   **Method**: `DELETE`
