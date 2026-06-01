import { Router } from 'express';
import { loginSchema, refreshSchema } from '../validation/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimit } from '../middleware/rate-limit.js';
import * as authController from '../controllers/auth.controller.js';

export const authRouter = Router();

// Login and refresh are the brute-force-worthy endpoints, so they get the
// tighter limiter.
authRouter.post('/login', authRateLimit, validate({ body: loginSchema }), authController.login);
authRouter.post(
  '/refresh',
  authRateLimit,
  validate({ body: refreshSchema }),
  authController.refresh,
);
authRouter.post('/logout', validate({ body: refreshSchema }), authController.logout);
authRouter.get('/me', authenticate, authController.me);
