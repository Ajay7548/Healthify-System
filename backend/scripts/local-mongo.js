// Dev-only: spin up a real mongod (via mongodb-memory-server) on a fixed port
// so the API can connect at mongodb://localhost:27017/healthcare without a
// system-wide MongoDB install. Data is ephemeral — the seed script repopulates
// on each start. Kill the process to stop it.
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create({
  instance: { port: 27017, dbName: 'healthcare' },
});

console.log('mongodb ready at', mongod.getUri());

const shutdown = async () => {
  await mongod.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
