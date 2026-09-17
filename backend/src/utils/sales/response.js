'use strict';

/**
 * Response helpers for the Sales module.
 *
 * Shapes follow the ERP contract §9.3 (`ERP_MODULE_DEVELOPMENT_CONTRACT.md`):
 *   success: { success: true, message, data }
 *   failure: { success: false, message, errorCode, details }  (rendered by the
 *            module's own error boundary - see `errorBoundary.js`)
 *
 * List endpoints add the pagination block the module's screens consume under
 * `meta`, which is an additive extension of the contract envelope:
 *   { success: true, message, data: [...], meta: { page, pageSize, total, totalPages } }
 */

function sendSuccess(res, data, message = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendPaginated(res, data, meta, message = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: {
      page: meta.page,
      pageSize: meta.pageSize,
      total: meta.total,
      totalPages: meta.totalPages,
    },
  });
}

/**
 * Failure envelope (contract §9.3, Core's flat shape).
 *
 * PH1 rendered `{ success, data, error: { code, message, details } }`; the
 * integrated module adopts Core's flat keys so every module on the platform
 * answers the same way. `details` is always present (`null` when the error has
 * no field-level information) and never carries a stack trace.
 */
function sendError(res, errorCode, message, statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    details,
  });
}

module.exports = { sendSuccess, sendPaginated, sendError };
