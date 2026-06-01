import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

function isDuplicateKeyError(error) {
  return typeof error === 'object' && error !== null && error.code === 11000;
}

// The single place HTTP error responses are shaped. It maps our own errors and
// the few framework/database errors that reach it onto the standard envelope.
// Anything unrecognized is a bug: it's logged with the request id and returned
// as an opaque 500 so we never leak internals (or a stack trace) in production.
//
// Must be registered last, and must keep all four arguments — that's how Express
// recognizes it as an error handler (the unused _next is required for that).
export function errorHandler(err, req, res, _next) {
  const requestId = req.id;

  const respond = (status, body) => {
    res.status(status).json({ success: false, error: body, requestId });
  };

  if (err instanceof AppError) {
    respond(err.statusCode, {
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // A ZodError thrown outside the validate middleware (e.g. inside a service).
  if (err instanceof ZodError) {
    respond(400, {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (isDuplicateKeyError(err)) {
    respond(409, {
      code: 'CONFLICT',
      message: 'A record with these details already exists',
      details: err.keyValue,
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    respond(400, {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    respond(400, { code: 'BAD_REQUEST', message: `Invalid value for "${err.path}"` });
    return;
  }

  // Unknown — a real bug. Log it with full context; return something opaque.
  logger.error({ err, requestId }, 'Unhandled error');
  respond(500, {
    code: 'INTERNAL_ERROR',
    message: isProd
      ? 'Something went wrong on our end'
      : err instanceof Error
        ? err.message
        : 'Unknown error',
  });
}
