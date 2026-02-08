// ===========================================
// Database Connection
// ===========================================

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index.js';
import * as schema from '../db/schema/index.js';
import logger from './logger.js';

const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ error: err.message }, 'Unexpected database pool error');
});

export { pool };

export const db = drizzle(pool, { schema });

export default db;
