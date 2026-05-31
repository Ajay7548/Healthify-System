import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { meRouter } from './modules/reports/report.routes.js';
import { adminUsersRouter } from './modules/users/user.routes.js';
import { adminUploadsRouter } from './modules/uploads/upload.routes.js';
import { adminInsightsRouter } from './modules/insights/insights.routes.js';

// Builds the versioned API router (/api/v1). Feature routers are mounted here as
// they're added, keeping app.js focused on the middleware pipeline.
export function createApiRouter() {
  const router = Router();

  router.use('/auth', authRouter);
  router.use('/me', meRouter);
  router.use('/admin', adminUsersRouter);
  router.use('/admin', adminUploadsRouter);
  router.use('/admin', adminInsightsRouter);

  return router;
}
