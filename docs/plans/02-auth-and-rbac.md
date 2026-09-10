# P2 — Authentication and RBAC

## Objective

Allow valid users to sign in, receive an access token, access permitted routes, and receive correct backend authorization failures.

## Source data

The nguoi_dung table is the source of truth for:

- id;
- ho_ten;
- email;
- mat_khau;
- vai_tro;
- phong_ban;
- trang_thai.

Never return mat_khau or a password hash in any response.

## P2.1 — Backend login

### Endpoints

- POST /api/v1/auth/login
- GET /api/v1/auth/me
- POST /api/v1/auth/logout if the token strategy requires server-side revocation.

### Login flow

1. Validate email and password.
2. Find nguoi_dung by email.
3. Use a generic message for an unknown user.
4. Reject a user whose trang_thai is not hoat_dong.
5. Compare the bcrypt hash.
6. Issue a short-lived access token.
7. Return a safe profile and permission set.

### Security

- Rate-limit login.
- Never log passwords, tokens, or Authorization headers.
- Do not put sensitive data in the access token.
- Add refresh tokens only after the policy is approved.

## P2.2 — Permission middleware

- Parse and verify the bearer token.
- Attach the authenticated user to request context.
- Distinguish authentication failure 401 from permission failure 403.
- Create a reusable assertPermission helper in the service layer.
- Do not rely on hidden React buttons; every mutation must be enforced in the backend.

## P2.3 — MVP permission contract

| Capability | admin | ban_hang | kho | ke_toan |
|---|---:|---:|---:|---:|
| View dashboard | Yes | Yes | Limited | Limited |
| View customers | Yes | Yes | No | Yes |
| Create/edit customers | Yes | Yes | No | Limited |
| Create/edit orders | Yes | Yes | No | No |
| Confirm/cancel orders | Yes | Yes | No | No |
| View deliveries | Yes | Limited | Yes | No |
| Create/update deliveries | Yes | Limited | Yes | No |
| View invoices | Yes | Yes | No | Yes |
| Create invoices | Yes | Policy-dependent | No | Yes |
| View receivables | Yes | Read | No | Yes |

If the real policy differs, update P0 before writing guards.

## P2.4 — Frontend authentication

- Login page with loading, validation, generic errors, and retry.
- Store tokens according to the approved strategy; never log tokens.
- ProtectedRoute redirects unauthenticated users to /login.
- Auth context calls /auth/me during app startup.
- Logout clears the session and sensitive query cache.
- PermissionGate is UX only; it does not replace backend authorization.

## P2.5 — Tests

- Correct password succeeds.
- Wrong password and unknown email use the same error class.
- Locked or inactive users cannot sign in.
- Missing, expired, and invalid-signature tokens.
- An under-permissioned route returns 403.
- Profile responses contain no mat_khau.
- Refresh/revoke behavior if implemented.

## P2 exit criteria

- A protected endpoint rejects requests without a token.
- Each role reaches only its permitted modules.
- A user cannot call a forbidden mutation by sending HTTP directly.
- Login, logout, and protected routes work in the UI.
- Both 401 and 403 have automated coverage.

## Suggested commit slices

- feat: add authentication contract and service
- feat: add JWT middleware and RBAC
- feat: add login and protected frontend routes
- test: cover authentication and permission matrix

