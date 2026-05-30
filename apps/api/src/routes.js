import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';

// Builds the versioned API router (/api/v1). Feature routers are mounted here as
// they're added, keeping app.js focused on the middleware pipeline.
export function createApiRouter() {
  const router = Router();

  router.use('/auth', authRouter);
  // Mounted in later phases:
  // router.use('/me', meRouter);
  // router.use('/admin', adminRouter);

  return router;
}
