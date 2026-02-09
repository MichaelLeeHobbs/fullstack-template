// ===========================================
// Server Entry Point
// ===========================================
// Starts the Express server with graceful shutdown.

import app from './app.js';
import { config } from './config/index.js';
import logger from './lib/logger.js';
import { pool } from './lib/db.js';
import { cleanupExpiredData } from './jobs/cleanup.js';

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info({ env: config.NODE_ENV }, 'Environment');
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Schedule expired data cleanup (hourly)
const cleanupInterval = setInterval(cleanupExpiredData, 60 * 60 * 1000);
setTimeout(cleanupExpiredData, 30_000).unref();

// Graceful shutdown
function shutdown(signal: string) {
  logger.info({ signal }, 'Received signal, shutting down gracefully');
  clearInterval(cleanupInterval);
  server.close(() => {
    pool.end().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
