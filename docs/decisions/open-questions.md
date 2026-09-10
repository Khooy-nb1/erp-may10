# P0 Open Questions

**Status:** P0 incomplete. No stakeholder answers or live PostgreSQL evidence were supplied in this session. These questions must be resolved before the dependent behavior is treated as final.

| ID | Decision required | Owner needed | Safe interim rule | Implementation impact |
|---|---|---|---|---|
| Q1 | What is the tax policy: fixed, configurable, or entered per invoice? | Finance / business owner | Do not hard-code an unapproved rate; keep tax policy behind configuration | Pricing, invoice totals, dashboard reconciliation, tests |
| Q2 | May Sales override `san_pham.gia_ban`? | Sales manager / finance | Use server-authoritative `san_pham.gia_ban`; reject client unit prices | Order request schema and pricing service |
| Q3 | Is credit-limit excess a warning or hard block? | Finance / sales leadership | Use explicit policy configuration; no approval workflow without schema | Confirm action, error/acknowledgement contract, locking |
| Q4 | Who moves `da_xac_nhan` → `dang_san_xuat`? | Production owner / admin | Sales reads the state; no Production side effect in MVP | Order action permissions and endpoint existence |
| Q5 | Who owns creation/update of `cong_no` receivables? | Accounting owner | Sales reads only; do not insert duplicate receivables | Invoice transaction boundary and P8/P9 reconciliation |
| Q6 | When may an invoice be created: after confirmation, after delivery, or both? | Accounting / sales owner | Reject unapproved states; do not invoice `cho_xac_nhan` or `huy` | Invoice validation and UI action availability |
| Q7 | May one order have multiple invoices or partial invoices? | Accounting owner | Treat one-to-one as provisional service policy; no schema assumption | Duplicate/cumulative invoice rules |
| Q8 | Who may create invoices: `ke_toan`, `admin`, or approved Sales users? | Accounting / admin owner | `ke_toan` and `admin` only as provisional default | RBAC |
| Q9 | Who may cancel a confirmed order? | Sales leadership / admin | Allow only approved action; never cancel `dang_san_xuat` or `da_giao` | State transition and permission matrix |
| Q10 | Who may suspend/reactivate/close customers? | Sales leadership / accounting / admin | Sales reps cannot change status; admin owns status action provisionally | Customer status endpoint and audit |
| Q11 | Does MVP delivery support whole-order only or cumulative line quantities? | Warehouse / sales owner | Do not open quantity mutation until approved; no fake delivery detail history | P6 request schema, transactions, UI |
| Q12 | Is exact per-delivery product history required? | Warehouse / compliance owner | Not supported by current schema | Requires approved `chi_tiet_giao_hang` migration |
| Q13 | Is full customer payment transaction history required? | Accounting / compliance owner | Show cumulative paid/outstanding only | Requires approved payment-history table |
| Q14 | Are schema additions permitted for MVP? | DB administrator / architecture owner | No new tables, columns, or automatic migrations | Blocks delivery/payment/history enhancements |
| Q15 | What are the actual development database name, host, port, user, and secret-management method? | DBA / environment owner | Do not claim connectivity or run seed | P0 runtime acceptance and P1 health configuration |
| Q16 | Does the actual development database match the supplied SQL? | DBA | Compare before relying on any column/status | All repositories and validators |
| Q17 | Is the supplied seed approved for development/test use, and is its password fixture known? | DBA / security owner | Never seed production; do not expose fixture credentials | Login smoke tests and environment setup |

## Blocker

P0 acceptance requires runtime evidence: development database comparison, one SELECT per scoped table, and seed linkage verification. Static SQL review cannot close this phase. No dependent business policy should be presented as stakeholder-approved.
