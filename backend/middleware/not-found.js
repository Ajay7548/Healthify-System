import { NotFoundError } from '../utils/errors.js';

export function notFoundHandler(req, _res, next) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}
