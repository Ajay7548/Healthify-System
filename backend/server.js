import { createApp } from './app.js';
import { env, isProd } from './config/env.js';
import { logger } from './config/logger.js';
import { connectToDatabase, disconnectFromDatabase, syncIndexes } from './db.js';

async function bootstrap() {
  await connectToDatabase();
  // In production autoIndex is off, so build/verify indexes explicitly on boot.
  if (isProd) await syncIndexes();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown: stop accepting connections, close the DB, then exit.
  // The timeout is a backstop so a hung connection can't block the deploy.
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => {
      void disconnectFromDatabase().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
