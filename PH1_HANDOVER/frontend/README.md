# PH1 Sales — Frontend Module Map

| Path | Role |
|---|---|
| `frontend/src/sales/SalesRoutes.jsx` | Child router for `/sales/*` (registered from the approved seam `frontend/src/routes/AppRoutes.jsx`, guarded by `sales.view`) |
| `frontend/src/sales/pages/**` | Customers, products (catalogue read), orders, deliveries, invoices, receivables, dashboard |
| `frontend/src/sales/components/**` | Filter bars, create/confirm/cancel dialogs, reason dialogs, status chips, tables |
| `frontend/src/sales/services/**` | API wrappers over Core's Axios client (`frontend/src/services/api.js`) |
| `frontend/src/sales/config/**` | Role constants and money/aging gates used by the dashboard and receivables screens |
| `frontend/src/config/menu.js` | Sales navigation entries (approved seam; two-level navigation only) |

Ownership rules:

- Core shell, `AuthContext`, login, `ProtectedRoute`/`PermissionGuard` and design tokens are consumed, never forked (`BASELINE.md` §4.1 frozen paths).
- PH1 TSX is compiled by Core's Vite/esbuild pipeline (ruling R-4); no separate TS build.

Verification: `docs/ph1-remediation/STEP6_FRONTEND_EVIDENCE.md`, `STEP10_BUILD_EVIDENCE.md`.
