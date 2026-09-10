# P10 — Hardening, UAT, and Release

## Objective

Move the MVP from feature-complete to safely testable, acceptable, and releasable.

## P10.1 — Security review

- Helmet, CORS allowlist, and request-size limits.
- Login rate limiting.
- Bcrypt password verification.
- Generic invalid-credential messages.
- JWT expiry and revoke strategy.
- Parameterized SQL in every repository.
- Never log passwords, hashes, tokens, Authorization headers, or database passwords.
- Check permission on every mutation, not only in the UI.
- Check tenant/scope boundaries if multiple business units are introduced.

## P10.2 — Transactions and concurrency

Use row locks or conflict handling where required for:

- two users confirming the same order;
- duplicate invoice creation;
- simultaneous confirmation while the credit limit is nearly full.

Every multi-table mutation must have a rollback test for a failure in the middle of the operation.

**Q11-conditional checks, skipped while the interim header-only delivery strategy is active:**

- two deliveries updating cumulative quantity;
- delivery quantity conflict handling.

## P10.3 — Validation and data integrity

Verify these invariants:

- invoice.customer = order.customer;
- order-line product exists;
- delivery order exists;
- order total = server-calculated total;
- line total = server-calculated line total;
- receivable.customer = invoice.customer;
- paid <= invoice total;
- audit user exists and never comes from the client.

**Q11-conditional invariant, skipped while the interim header-only delivery strategy is active:**

- delivered quantity <= ordered quantity;

## P10.4 — Performance and indexes

- Measure list, detail, and dashboard APIs on representative data.
- Initial targets: list p95 < 500 ms, detail p95 < 300 ms, dashboard near 1 second where feasible.
- Run EXPLAIN ANALYZE before adding an index.
- Do not add speculative indexes.
- Check for N+1 queries in customer summary, order detail, and dashboard.

## P10.5 — Test matrix

### Unit

- pricing;
- discount/tax;
- credit;
- state transitions;
- invoice status;
- receivable aging;
- date and money.

### Repository

- filters;
- joins;
- pagination;
- aggregation;
- insert/update.

### Integration

Login → customer → order → confirm → delivery → invoice → receivable → dashboard.

### Authorization

Run route coverage with unauthenticated, ban_hang, kho, ke_toan, and admin users.

### E2E

- happy path;
- suspended customer;
- invalid order;
- failed delivery;
- overdue invoice;
- transaction rollback;
- refresh after mutation.

## P10.6 — UX and accessibility

- Keyboard navigation.
- Visible focus.
- Form labels and error association.
- Status meaning that does not rely only on color.
- Accessible dialogs.
- Loading, empty, error, and success state for every list/form.
- No console errors.

## P10.7 — Documentation

Update:

- OpenAPI at /api/docs;
- API conventions and error codes;
- permission matrix;
- state matrix;
- database table usage;
- business decisions;
- local/staging runbook;
- rollback procedure.

## P10.8 — UAT

Business testers validate:

- customers;
- sales orders;
- deliveries;
- invoices;
- receivables;
- dashboard;
- permissions.

For every case record: input, user role, expected result, actual result, evidence, and defect id.

## P10.9 — Release checklist

- Backend/frontend builds pass.
- Test suite passes.
- Environment secrets are configured outside git.
- Database backup exists.
- Migrations were manually reviewed.
- Health check is operational.
- API documentation is published.
- Logging/error monitoring is enabled.
- Role matrix is signed off.
- Production build has passed smoke testing.
- Rollback procedure has been tried in staging.

## P10 exit criteria

- The E2E happy path passes from login to dashboard.
- No security, data-integrity, or ownership blocker remains.
- UAT is signed off.
- Release and rollback evidence exist.
- The branch is ready for a pull request; do not merge into main automatically.

## Suggested commit slices

- test: add integration and authorization matrix
- security: harden auth and request handling
- perf: review query plans and indexes
- docs: publish API and release runbook
- qa: record UAT evidence

