import { UnauthorizedError } from '../utils/errors.js';
import { verifyAccessToken } from '../services/token.service.js';

const BEARER_PREFIX = 'Bearer ';

// Require a valid access token and attach the principal to req.user. This is the
// authoritative check — the frontend's route guards are a UX nicety, not a
// security boundary.
export function authenticate(req, _res, next) {
  const header = req.header('authorization');
  if (!header?.startsWith(BEARER_PREFIX)) {
    next(new UnauthorizedError('Missing or malformed Authorization header'));
    return;
  }

  try {
    req.user = verifyAccessToken(header.slice(BEARER_PREFIX.length).trim());
    next();
  } catch (error) {
    next(error);
  }
}
