'use strict';

const { AppError } = require('./errors');
const { sendError } = require('./response');

/**
 * Module-scoped error boundary, mounted last inside `routes/salesRoutes.js`.
 *
 * Why it exists: Core's `middlewares/errorHandler.js` renders `details` from
 * `err.stack` (development) or drops it (production), so the field-level
 * validation array the module produces never reaches the client. Contract §9.3
 * requires `{ success: false, message, errorCode, details }`, and the module's
 * screens render per-field messages, so the module renders its own errors.
 *
 * Scope is deliberately narrow: only the module's own `AppError` hierarchy is
 * handled here. Everything else (PostgreSQL errors, Core middleware failures,
 * unexpected exceptions) is forwarded unchanged to Core's handler, which keeps
 * its behaviour - including its stack-trace policy - for the whole platform.
 */
function salesErrorBoundary(err, req, res, next) {
  if (!(err instanceof AppError)) {
    return next(err);
  }
  if (res.headersSent) {
    return next(err);
  }
  return sendError(res, err.errorCode, err.message, err.statusCode, normaliseDetails(err.details));
}

/**
 * Renders field-level details in the contract shape `[{ field, message }]`.
 * Validator issues carry zod's `{ path: [...], message }`; anything already in
 * the contract shape is passed through, and messages that arrive as plain
 * strings keep their value with a `null` field.
 */
function normaliseDetails(details) {
  if (!Array.isArray(details) || details.length === 0) {
    return null;
  }
  return details.map((entry) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      if (entry.field !== undefined) {
        return { field: entry.field, message: entry.message ?? null };
      }
      if (Array.isArray(entry.path)) {
        return { field: entry.path.join('.'), message: entry.message ?? null };
      }
    }
    return { field: null, message: entry === undefined || entry === null ? null : String(entry) };
  });
}

module.exports = { salesErrorBoundary };
