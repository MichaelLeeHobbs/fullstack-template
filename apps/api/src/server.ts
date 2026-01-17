// ===========================================
// Server Entry Point
// ===========================================
// Starts the Express server.

import app from './app.js';
import { config } from './config/index.js';
import logger from './lib/logger.js';

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${config.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

