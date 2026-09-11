import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { sendError, ErrorDetail } from '../utils/response.js';
import { logError } from '../utils/logger.js';
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId = req.id || 'unknown';

  // 1. Zod validation errors
  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'VALIDATION_ERROR', 'Validation failed for one or more request fields.', 422, details);
    return;
  }

  // 2. Custom AppError instances
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // 3. PostgreSQL specific errors (e.g. unique violation)
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
    if (err.code === '23505') {
      // Unique violation
      sendError(res, 'DATABASE_CONFLICT', 'Operation conflicted with existing data or concurrent modification.', 409);
      return;
    }
    if (err.code === '23503') {
      // Foreign key violation
      sendError(res, 'FOREIGN_KEY_VIOLATION', 'Referenced resource does not exist.', 422);
      return;
    }
  }

  // 4. Malformed JSON payload (Express BodyParser syntax error)
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'INVALID_JSON', 'Malformed JSON payload in request body.', 400);
    return;
  }

  // 5. Unexpected Internal Errors
  logError('UNHANDLED_ERROR', {
    requestId,
    url: req.originalUrl,
    method: req.method,
    error: err instanceof Error ? err.stack || err.message : String(err),
  });

  // Never leak internal stack traces or database connection secrets to client
  sendError(res, 'INTERNAL_SERVER_ERROR', 'An unexpected internal server error occurred.', 500);
}
