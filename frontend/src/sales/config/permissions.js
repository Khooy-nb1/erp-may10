/**
 * Sales module role scopes (PH1 `roles-permissions` §3.2).
 *
 * Route access is Core's job: `/sales/*` is mounted behind
 * `<PermissionGuard permission="sales.view">` in `routes/AppRoutes.jsx` (owner ruling R-1).
 * What lives here is the narrower, per-widget scope PH1 applied on top of that gate — which
 * roles may request the money-backed overview endpoints, and which may read finance data.
 * The client must not issue a request the role is denied: a hidden card is the contract, a
 * 403 banner is not.
 */

/** Roles that may read the money-backed overview metrics (`kho` is served a fulfillment scope only). */
export const MONEY_METRIC_ROLES = Object.freeze(['admin', 'ban_hang', 'ke_toan']);

/**
 * Roles that may read finance data: the receivable aging buckets (owner ruling R-2),
 * a customer's receivables ledger, and the invoice-issuance flow.
 */
export const FINANCE_ROLES = Object.freeze(['admin', 'ke_toan']);

/** Core user record -> role key. Accepts the shapes Core sends (`vai_tro`) and the legacy aliases. */
function roleOf(user) {
  return (user && (user.role || user.vai_tro || user.dbRole)) || '';
}

export function isAdmin(user) {
  return roleOf(user) === 'admin';
}

export function hasAnyRole(user, roles) {
  return roles.includes(roleOf(user));
}
