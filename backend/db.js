import mongoose from 'mongoose';
import { env, isProd } from './config/env.js';
import { logger } from './config/logger.js';

// Reject queries that reference fields not in the schema rather than silently
// returning everything — a safer default for a data-sensitive app.
mongoose.set('strictQuery', true);

export async function connectToDatabase(uri = env.MONGODB_URI) {
  // Auto-build indexes in dev/test for convenience. In production we leave it
  // off and call syncIndexes() explicitly on boot, so a deploy never triggers a
  // surprise foreground index build on the first query that needs it.
  mongoose.set('autoIndex', !isProd);

  const connection = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info(
    { host: connection.connection.host, db: connection.connection.name },
    'Connected to MongoDB',
  );
  return connection;
}

export async function disconnectFromDatabase() {
  await mongoose.disconnect();
}

// Make every registered model's indexes match its schema. Safe to call on every
// boot — it's a no-op when nothing changed. This is how indexes get built in
// production (where autoIndex is disabled).
export async function syncIndexes() {
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  logger.info('Model indexes are in sync');
}
