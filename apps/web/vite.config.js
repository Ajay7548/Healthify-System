import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Resolve the shared package straight to its source so runtime and the
      // browser bundle stay in lock-step with no separate build step.
      '@hc/shared': fileURLToPath(new URL('../../packages/shared/src/index.js', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // In dev the browser talks to a same-origin /api and Vite forwards it to the
    // Express server — no CORS, no hard-coded localhost in the client code.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
