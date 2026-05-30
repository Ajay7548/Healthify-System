import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { meRouter } from './modules/reports/report.routes.js';
import { adminUsersRouter } from './modules/users/user.routes.js';

// Builds the versioned API router (/api/v1). Feature routers are mounted here as
// they're added, keeping app.js focused on the middleware pipeline.
export function createApiRouter() {
  const router = Router();

  router.use('/auth', authRouter);
  router.use('/me', meRouter);
  router.use('/admin', adminUsersRouter);
  // The CSV upload routes mount under /admin too (added with that feature).

  return router;
}
