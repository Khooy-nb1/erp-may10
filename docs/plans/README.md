# ERP Sales & CRM — Detailed Implementation Plans

This folder decomposes the [Master Implementation Plan](../ERP_Sales_CRM_Master_Implementation_Plan.md) into executable plans that can be implemented, tested, and accepted phase by phase.

## 1. Scope

The MVP target flow is:

    Login
      → Customers
      → Products
      → Sales Orders
      → Deliveries
      → Invoices
      → Accounts Receivable
      → Dashboard

Out of MVP scope: production, purchasing, suppliers, inventory valuation, general ledger, detailed payment history, and exact per-delivery line history unless the schema is explicitly approved for extension.

## 2. Verified baseline

- Working branch: ph1-bh-qlkh.
- The repository contains backend and frontend directories, but most application files are still empty JavaScript skeletons.
- PostgreSQL schema and seed files exist under backend/database.
- The master plan targets TypeScript, but the repository does not yet have a working TypeScript foundation.
- Phase 0 and Phase 1 must therefore be completed before business modules.
- Do not move the whole repository to apps/api and apps/web in the MVP without a separate decision; keep the existing backend and frontend layout to limit change.

## 3. Execution order

| ID | Plan | Depends on | Main result |
|---|---|---|---|
| P0 | Discovery and decisions | None | Schema, ownership, policy, and conventions are agreed |
| P1 | Foundation | P0 | API, DB pool, frontend shell, and health check |
| P2 | Authentication and RBAC | P1, P0 | Login, tokens, protected routes, and permissions |
| P3 | Customer Management | P2 | CRUD, status, summary, and detail |
| P4 | Product Lookup | P1, P0 | Product list and selector |
| P5 | Sales Orders | P2, P3, P4 | Order lifecycle and server-side pricing |
| P6 | Deliveries | P5, P0 | Delivery workflow and progress |
| P7 | Invoices | P5, P0 | Invoices and payment status |
| P8 | Receivables | P7, P0 | Receivables and aging |
| P9 | Dashboard | P3, P5, P6, P7, P8 | Reconciled commercial metrics |
| P10 | Hardening, UAT, and Release | P2–P9 | Security, tests, performance, acceptance, and release |

## 4. Child plans

1. [P0 — Discovery and decisions](00-discovery-and-decisions.md)
2. [P1 — Foundation](01-foundation.md)
3. [P2 — Authentication and RBAC](02-auth-and-rbac.md)
4. [P3 — Customer Management](03-customers.md)
5. [P4 — Product Lookup](04-products.md)
6. [P5 — Sales Orders](05-sales-orders.md)
7. [P6 — Delivery Management](06-deliveries.md)
8. [P7 — Invoice Management](07-invoices.md)
9. [P8 — Accounts Receivable](08-receivables.md)
10. [P9 — Dashboard](09-dashboard.md)
11. [P10 — Hardening, UAT, and Release](10-hardening-uat-release.md)

## 5. Working rules

- Work only on branch ph1-bh-qlkh.
- Every task must have evidence: a test, query result, screenshot, or relevant log.
- The backend owns business rules, pricing, status transitions, and permissions.
- The frontend never connects directly to PostgreSQL.
- Do not accept audit fields, status, or totals from the client when the backend can calculate them.
- Do not add migrations or tables without a P0 decision.
- Do not physically delete transactional data; use status or cancellation.
- Commit in small slices such as foundation, auth, customers, products, and orders.

## 6. Definition of Ready

A task is ready only when:

- its dependencies have passed acceptance;
- input and output are clear;
- no unresolved business decision blocks it;
- a test or verification method exists;
- the files/modules to be changed are known.

## 7. Shared Definition of Done

A feature is done only when:

- the API and validation work;
- backend permissions are enforced;
- the UI has loading, empty, error, and success states;
- audit fields come from the authenticated user;
- core business tests pass;
- OpenAPI and business rules are updated;
- there are no console errors or sensitive logs;
- it has been checked with seed data and empty data.

## 8. Final acceptance journey

Login → create/find a customer → check credit → create an order → add products → server calculates price → confirm → create delivery → complete delivery → create invoice → review receivables → open customer detail → verify dashboard.

