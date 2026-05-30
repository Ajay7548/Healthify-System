import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectToDatabase, disconnectFromDatabase, syncIndexes } from '../config/db.js';

// Spins up a throwaway in-memory MongoDB so integration tests run against a real
// database (indexes, unique constraints, aggregation) without any external service.
let memoryServer;

export async function setupTestDb() {
  memoryServer = await MongoMemoryServer.create();
  await connectToDatabase(memoryServer.getUri());
  await syncIndexes();
}

export async function teardownTestDb() {
  await disconnectFromDatabase();
  await memoryServer?.stop();
}

export async function clearCollections() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}
