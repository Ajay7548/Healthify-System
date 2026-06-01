import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestId } from './middleware/request-id.js';
import { globalRateLimit } from './middleware/rate-limit.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.routes.js';
import { createApiRouter } from './routes.js';

// Assemble the Express app. Kept free of listen() so tests can import it and
// drive it with supertest. Middleware order matters and is deliberate:
//
//   request id -> log -> security headers -> CORS -> health (cheap, unmetered)
//   -> body parse -> rate limit -> routes -> 404 -> central error handler
export function createApp() {
  const app = express();

  // We sit behind exactly one proxy hop on Render; tell Express so rate-limiting
  // and req.ip use the real client address rather than the proxy's.
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

  // Health checks run before body-parsing and rate-limiting so frequent uptime
  // pings stay cheap and never exhaust a client's request budget.
  app.use(healthRouter);

  app.use(express.json({ limit: '1mb' }));
  app.use(globalRateLimit);

  app.use('/api/v1', createApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
