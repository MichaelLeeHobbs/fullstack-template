// ===========================================
// Test Setup — Environment Variables
// ===========================================
// Provides env vars required by src/config/index.ts (Zod-validated).
// Runs before every test file via vitest setupFiles.

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://app:app_dev@localhost:5432/app_test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long';
process.env.LOG_LEVEL = 'error';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.S3_ENDPOINT = 'http://localhost:9000';
process.env.S3_ACCESS_KEY = 'test-access-key';
process.env.S3_SECRET_KEY = 'test-secret-key';
process.env.S3_BUCKET = 'test-bucket';
