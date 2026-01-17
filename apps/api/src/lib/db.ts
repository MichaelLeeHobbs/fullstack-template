// ===========================================
// Database Connection
// ===========================================

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index.js';
import * as schema from '../db/schema/index.js';

const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export default db;

