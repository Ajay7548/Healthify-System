import { Router } from 'express';
import mongoose from 'mongoose';

// Infrastructure endpoints for load balancers and uptime checks. Deliberately
// minimal and outside the /api/v1 surface and the rate limiter:
//   /healthz  liveness: the process is up.
//   /readyz   readiness: the process can serve traffic (DB is connected).
export const healthRouter = Router();

healthRouter.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

healthRouter.get('/readyz', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ready' : 'unavailable',
    db: dbConnected ? 'up' : 'down',
  });
});
