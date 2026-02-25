# Scaffolding Guide

Congratulations! You've just scaffolded a new project using the `babytrack` template. This document outlines how to effectively repurpose this initial "todo app" state into your actual business domain. 

The `create-project.sh` script handled the initial heavy lifting of changing the Go module name, database name, and Docker/deployment references. However, the business logic inside the application is still geared towards "Todos". 

Here is a quick guide on what to keep, what to delete, and where to start modifying.

## What to Keep (The Foundation)

The power of this template lies in the robust, production-ready foundation setup in `cmd/` and `pkg/`. **You likely do not need to modify these immediately:**

-   **`cmd/main.go`**: Contains the dependency injection, middleware wiring, database connection logic, timeout settings, and graceful shutdown. You will edit this file to register *new* routes (e.g., swapping `todoRouter` for `userRouter`), but the core structure remains the same.
-   **`pkg/middleware`**: The core middleware stack (Recovery, Logger, Request ID, Rate Limiting, Auth, CORS) is domain-agnostic and ready for production. 
-   **`pkg/auth`**: JWT logic. Unless you are changing authentication strategies (e.g., moving to OAuth), keep this untouched.
-   **`internal/config/config.go`**: Handles environment variables with sane defaults. Add your new environment variables here.
-   **`pkg/router`**: The custom lightweight router wrapper.
-   **Deploy Scripts & GitHub Actions**: The Dockerfile, `deploy-local.sh`, and `.github/workflows` should work out-of-the-box for deploying your new application to a VPS.

## What to Modify (The Business Logic)

You'll spend most of your time replacing the existing "Todo" logic with your new application logic.

### 1. Database Migrations
-   Delete `migrations/0001_create_todos_table.up.sql` and `migrations/0001_create_todos_table.down.sql`.
-   Create a new migration (e.g., `migrations/0001_create_users_table.up.sql`) with your application's schema.
-   Remember to run your app (`go run cmd/main.go`) to automatically apply it.

### 2. Domain Logic (`internal/`)
-   Delete or heavily refactor the `internal/todo/` directory.
-   Create a new domain folder (e.g., `internal/account/`).
-   Inside the new folder, implement your layered architecture:
    -   `model.go`: Struct definitions matching your new database tables.
    -   `repository.go`: Postgres SQL queries for data access.
    -   `service.go`: Core business logic and validation.
    -   `handler.go`: HTTP endpoints returning JSON responses.
-   Leave `internal/health/` and `internal/version/` alone; they provide critical deployment and liveness checks.

### 3. Wiring it up (`cmd/main.go`)
-   In `cmd/main.go`, replace references to `todo.NewPostgresRepository` and `todo.NewHttpHandler` with your newly created domain logic.
-   Mount your new router: `rootRouter.Handle("/api/", myNewDomainRouter)`.

### 4. Frontend (`frontend/`)
The frontend is a vanilla JS + Lit Web Components application served by the Go binary. 
-   **API Client**: Update `frontend/services/api.js` to point to your new endpoints.
-   **Components**: Replace `components/todo-app.js` and `components/todo-item.js` with your own components and build your new interface. Keep `index.css` for the design system foundation.

## Standard Development Flow
1. Add environment variables to `.env`.
2. Write SQL Migration.
3. Write Go Models -> Repository -> Service -> HTTP Handler (with unit tests).
4. Register Handler in `cmd/main.go`.
5. Update Frontend API Client to call new endpoint.
6. Build out Frontend UI.
7. Run tests `go test ./...` and push!
