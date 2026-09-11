export interface ErrorDetail {
  field?: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ErrorDetail[] | null;

  constructor(statusCode: number, code: string, message: string, details: ErrorDetail[] | null = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request parameters', details: ErrorDetail[] | null = null) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required. Token is missing, expired, or invalid.') {
    super(401, 'AUTH_UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(403, 'AUTH_FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(code = 'NOT_FOUND', message = 'The specified resource was not found.') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(code = 'DATABASE_CONFLICT', message = 'Operation conflicted with existing data or concurrent modification.') {
    super(409, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed for one or more request fields.', details: ErrorDetail[] | null = null) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}
