import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function createLimiter(max, code, message) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Respond in the same envelope as the rest of the API.
    handler: (req, res) => {
      res.status(429).json({ success: false, error: { code, message }, requestId: req.id });
    },
  });
}

// Generous ceiling for normal browsing.
export const globalRateLimit = createLimiter(
  300,
  'RATE_LIMITED',
  'Too many requests — please slow down and try again shortly.',
);

// Deliberately tight: login is the endpoint most worth brute-forcing.
export const authRateLimit = createLimiter(
  10,
  'AUTH_RATE_LIMITED',
  'Too many attempts. Please wait a few minutes before trying again.',
);
