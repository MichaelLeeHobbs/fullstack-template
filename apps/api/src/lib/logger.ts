// ===========================================
// Pino Logger Configuration
// ===========================================
// Pretty printing in development, JSON in production.

import { createRequire } from 'module';
import type { Logger, TransportSingleOptions } from 'pino';
import { config } from '../config/index.js';

// Use createRequire for proper ESM/CJS interop with pino
const require = createRequire(import.meta.url);
const pino = require('pino') as typeof import('pino').default;

const devTransport: TransportSingleOptions = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
};

export const logger: Logger = pino({
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV === 'development' ? devTransport : undefined,
});

export default logger;

