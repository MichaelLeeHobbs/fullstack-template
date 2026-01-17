// ===========================================
// Express Application
// ===========================================
// Configures middleware chain and mounts routes.

import { createRequire } from 'module';
import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { config } from './config/index.js';
import logger from './lib/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

// Use createRequire for proper ESM/CJS interop with pino-http
const require = createRequire(import.meta.url);
const pinoHttp = require('pino-http') as typeof import('pino-http').default;

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.NODE_ENV === 'development' ? '*' : undefined,
    credentials: true,
  })
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => (req as Request).url === '/health',
    },
  })
);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/v1', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

