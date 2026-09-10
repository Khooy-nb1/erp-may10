# P1 — Project Foundation

## Objective

Turn the current skeleton into a runnable local application with safe PostgreSQL connectivity and a frontend shell. Do not build customer/order business logic in this phase.

## Structure decision

- Keep backend/ and frontend/ to avoid a large directory migration.
- Move toward TypeScript inside the existing directories.
- Adopt apps/api and apps/web only after a separate P0 decision.
- Do not run automatic ORM migrations because the database schema already exists.

## P1.1 — Package setup and TypeScript

- Choose one package manager and record its version.
- Create consistent scripts for dev, build, test, lint, and typecheck.
- Create backend and frontend tsconfig files.
- Enable strict mode incrementally; do not allow any to spread into new modules.
- Create env.example and never commit secrets.
- Pin the selected packages from the plan: Express, pg, Zod, logger, JWT, bcrypt, React, router, query client, and form validation.

## P1.2 — Backend bootstrap

Create at minimum:

- backend/src/app.ts: Express app, middleware, and routes.
- backend/src/server.ts: port binding and graceful shutdown.
- backend/src/config/env.ts: environment validation.
- backend/src/config/database.ts: one shared PostgreSQL pool.
- backend/src/middlewares/error.middleware.ts.
- backend/src/middlewares/request-id.middleware.ts.
- backend/src/utils/response.ts.

Controllers must not contain SQL or transaction orchestration.

## P1.3 — Database and transactions

- Configure pool limits and query timeout.
- Create a transaction helper for begin, commit, rollback, and release.
- Reject startup when required database configuration is missing.
- Never create a physical connection per request.
- Log database errors with request id but never log passwords or connection secrets.

## P1.4 — Health and baseline observability

- GET /api/v1/health returns process and database status.
- Every request has requestId, method, path, status, and duration.
- Global error mapping distinguishes 400, 401, 403, 404, 409, 422, and 500.
- Configure CORS allowlist, Helmet, and body-size limits.

## P1.5 — Frontend shell

Create shared foundations:

- App entry and router.
- Query client.
- API client with timeout and error-contract mapping.
- Auth context placeholder for P2.
- AppShell, PageHeader, LoadingState, EmptyState, and ErrorState.
- Routes for login, dashboard, customers, products, sales-orders, deliveries, invoices, and receivables.
- Do not show navigation for screens that are not implemented.

## P1.6 — Local development

- docker-compose starts only approved dependencies.
- Document install, dev, build, test, and database setup commands.
- Health check works after the database is ready.
- Seed has a separate command and a development/test-only warning.

## P1.7 — Test foundation

- Test response helpers, environment validation, error mapping, and transaction rollback.
- Create a test database or harness that cannot use the production database.
- Add a smoke test for the health endpoint.

## P1 exit criteria

- Backend build and typecheck pass.
- Frontend build and typecheck pass.
- GET /api/v1/health reports database healthy when the DB is running.
- One validation error and one unexpected error match the error contract.
- The frontend opens the shell and routes correctly.
- No secret is tracked by git.

## Suggested commit slices

- chore: bootstrap backend TypeScript
- chore: bootstrap frontend shell
- feat: add database pool and health check
- test: add foundation smoke tests

