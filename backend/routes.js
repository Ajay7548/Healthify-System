import { Router } from 'express';
import { authRouter } from './routes/auth.routes.js';
import { meRouter } from './routes/report.routes.js';
import { adminUsersRouter } from './routes/user.routes.js';
import { adminUploadsRouter } from './routes/upload.routes.js';
import { adminInsightsRouter } from './routes/insights.routes.js';

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
