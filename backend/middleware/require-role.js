import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

// Gate a route to specific roles. Always runs after authenticate. Returns 401
// when there's no authenticated user and 403 when the user is authenticated but
// lacks the role — the distinction matters to clients.
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
