import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { meRouter } from './modules/reports/report.routes.js';

// Builds the versioned API router (/api/v1). Feature routers are mounted here as
// they're added, keeping app.js focused on the middleware pipeline.
export function createApiRouter() {
  const router = Router();

  router.use('/auth', authRouter);
  router.use('/me', meRouter);
  // Mounted in later phases:
  // router.use('/admin', adminRouter);

  return router;
}
