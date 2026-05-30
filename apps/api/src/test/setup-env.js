// Vitest doesn't use --env-file, so provide the variables env.js validates at
// import time. The real database URI is supplied per-test by mongodb-memory-server.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-fedcba9876543210';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/healthcare-test';
process.env.CORS_ORIGIN ||= 'http://localhost:5173';
