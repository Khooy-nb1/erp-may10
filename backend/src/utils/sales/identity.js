'use strict';

/**
 * Identity helpers for the Sales module.
 *
 * Core's `authMiddleware` populates `req.user` with
 * `{ id, name, email, dbRole, role, rawRole, phong_ban, trang_thai }`, where
 * `role` is the canonical Vietnamese role (`admin`, `ban_hang`, `kho`,
 * `ke_toan`, `san_xuat`, `mua_hang`). PH1 read `req.userId` / `req.user.vai_tro`
 * from its own JWT middleware, so the ported handlers use these helpers instead
 * of touching the request object directly.
 */

/** Actor id used for `nguoi_tao` / `nguoi_cap_nhat` columns (PH1 fell back to 1). */
function currentUserId(req) {
  return (req.user && Number(req.user.id)) || 1;
}

/**
 * Canonical role of the caller, or `''` when it cannot be resolved. Callers must
 * treat `''` as "not an admin" - every role-gated rule in the module fails
 * closed.
 */
function currentRole(req) {
  const user = req.user || {};
  return user.role || user.dbRole || user.vai_tro || '';
}

module.exports = { currentUserId, currentRole };
