// The application's error vocabulary. Throwing one of these anywhere in a
// service or controller produces a predictable HTTP response via the central
// error handler — callers never assemble status codes by hand. `isOperational`
// distinguishes "expected" errors (bad input, missing resource) from genuine
// bugs, so the handler knows which ones are safe to surface verbatim.
export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class ValidationError extends AppError {
  constructor(details, message = 'Request validation failed') {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details) {
    super(409, 'CONFLICT', message, details);
  }
}
