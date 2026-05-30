import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Integration tests spin up an in-memory MongoDB; give them room and run
    // serially so they don't contend for the same ephemeral server.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    setupFiles: ['./src/test/setup-env.js'],
  },
});
