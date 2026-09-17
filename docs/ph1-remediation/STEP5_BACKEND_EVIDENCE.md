# PH1 Remediation — Step 5 Backend Evidence

**Document ID:** `DOC-PH1-REM-007`  
**Date:** 2026-09-16  
**Source Branch:** `feature/ph1-sale-core` @ `cf918b81a5af1f9a8ebb872fbd0d1514f0fb279d`  
**Target:** integration workspace `ph1-integration` (`backend/`), Core baseline `origin/develop` @ `7c98c78`  
**Scope:** `PLAN.md` Step 5 — backend remediation of all eight PH1 domains, mounted by Core at `/api/v1/sales`

---

## 1. What was ported

The standalone PH1 backend (TypeScript, its own Express app, its own JWT/auth, its own `env`/pool) became a
CommonJS Express router that Core mounts in `backend/src/app.js:82`. No PH1 file in `backend/src/**` of the
standalone branch was modified; the module is a new tree under `ph1-integration/backend/src`.

| Domain | Repository | Service | Routes | Mount |
|---|---|---|---|---|
| Customers | `repositories/sales/customer.repository.js` | `services/sales/customer.service.js` | `routes/sales/customers.routes.js` | `/api/v1/sales/khach-hang` |
| Products | `product.repository.js` | `product.service.js` | `products.routes.js` | `/api/v1/sales/san-pham` |
| Orders | `order.repository.js` | `order.service.js` | `orders.routes.js` | `/api/v1/sales/don-hang` |
| Deliveries | `delivery.repository.js` | `delivery.service.js` | `deliveries.routes.js` | `/api/v1/sales/giao-hang` |
| Invoices | `invoice.repository.js` | `invoice.service.js` | `invoices.routes.js` | `/api/v1/sales/hoa-don` |
| Receivables | `receivable.repository.js` | `receivable.service.js` | `receivables.routes.js` | `/api/v1/sales/cong-no` |
| Overview | `overview.repository.js` | `overview.service.js` | `overview.routes.js` | `/api/v1/sales/tong-quan` |
| Shared | — | — | `routes/salesRoutes.js` (mount + auth + error boundary) | `/api/v1/sales` |

Supporting module code replaces the PH1 infrastructure that Core owns: `config/sales.js` (business switches
only), `utils/sales/{validate,pricing,errors,response,logger,transaction,errorBoundary,identity}.js`.
`req.userId` and `req.user.vai_tro` no longer exist in Core, so the ported handlers read identity through
`utils/sales/identity.js` (`currentUserId`, `currentRole` -> Core's canonical `req.user.role`).

**Route inventory:** 32 endpoints (7 customer, 2 product, 6 order, 6 delivery, 3 invoice, 3 receivable, 5
overview) — matches `TARGET_DESIGN.md` §2.

---

## 2. Verification performed (all commands run from `ph1-integration/backend`)

| # | Check | Command | Result |
|---|---|---|---|
| V1 | Every module file parses and loads (no ESM/TS leftovers, no missing dependency) | `node -e "…require() each file…"` | 32/32 loaded, 0 failures |
| V2 | SQL preserved statement-for-statement from the PH1 originals | `node C:/Users/ACER/ph1-tmp/sql-diff.js <ph1.ts> <port.js>` | order 11/11, invoice 9/9, delivery 10/10, overview 7/7, receivable 4/4, product 4/4 — all `OK` |
| V3 | Transaction usage parity | `grep -c withTransaction` on both trees | order 3/3, invoice 3/3, delivery 2/2, others 0/0 |
| V4 | End-to-end API regression + RBAC + envelopes | `node tests/test_ph1_sales_api.js` | **115 passed, 0 failed** |
| V5 | Cross-domain flow | same suite: order -> confirm -> invoice; order -> delivery `start`/`complete`/`fail`; receivables aging/summary invariants; dashboard role scoping | pass |
| V6 | Core/PH4 regression after the mount | same suite: `/api/v1/auth/me`, `/api/v1/ton-kho`, `/api/v1/modules` | 200 |

`tests/test_ph1_sales_api.js` is the module's permanent regression suite (Step 11 asset). It drives the real
app against the configured database, asserts the contract §9.3 envelopes, the 401/403/404/409/422 matrix per
role, field-level validation details, the credit-limit confirmation path, the cancel-state matrix, delivery
lifecycle guards, invoice numbering/duplicate handling, aging-bucket exhaustiveness and dashboard scoping
(`kho` = fulfillment only, money metrics never serialized).

---

## 3. Deliberate differences from PH1 (and why)

| # | Difference | Reason / authority |
|---|---|---|
| D1 | Authentication is Core's (`requireAuth` + `signToken`), not PH1's JWT middleware | `PLAN.md` Step 5; PH1 `middlewares/auth.middleware.ts` retired |
| D2 | Write guards use the shipped `sales.*` permissions; reads keep PH1's role sets; delivery lifecycle and invoice issuance stay role-gated | Ruling R-1 / R-2 (recorded in `INTEGRATION_REQUESTS.md`) |
| D3 | Failure envelope is Core's flat `{ success, message, errorCode, details }` (PH1 nested `error`) | Contract §9.3; the module's screens are ported in Step 6 against this shape |
| D4 | Module-scoped error boundary renders the module's own errors | Core's `errorHandler` overwrites `details` with `err.stack` (dev) or drops it, so field-level validation messages never reached the client and 2 Gate-3 checks failed until the boundary existed. The boundary handles only the module's `AppError` hierarchy; every other error still goes to Core's handler |
| D5 | `details` entries are normalised to `[{ field, message }]` at the boundary | Validator issues are zod-shaped (`{ path, message }`); the contract shape is field-based |
| D6 | Identity helpers replace `req.userId` / `req.user.vai_tro` | Core's `req.user` exposes `{ id, role, dbRole, rawRole, role permissions taken from roleMapping }`; missing role fails closed |
| D7 | `overdueOnly` uses `Boolean()` coercion (the string `"false"` is truthy) | Preserved PH1/zod `z.coerce.boolean()` behaviour on purpose; logged in `KNOWN_GAPS.md` |
| D8 | Delivery transition query locks with `FOR UPDATE OF g` | PH1's `FOR UPDATE` over nullable outer joins raises `FOR UPDATE cannot be applied to the nullable side of an outer join` in PostgreSQL 16 — every `start`/`complete`/`fail` call returned 500. Fixed (see `KNOWN_GAPS.md` G-1) |

---

## 4. Reproduce

```bash
cd C:/Users/ACER/OtherProjects/ph1-integration/backend
node tests/test_ph1_sales_api.js          # 115 checks, exit 0
node -e "require('./src/routes/salesRoutes.js')"   # module loads
```

`sql-diff.js` lives at `C:/Users/ACER/ph1-tmp/sql-diff.js` (throwaway verification aid; it compares the
backtick SQL blocks of a PH1 repository/service against its port).
