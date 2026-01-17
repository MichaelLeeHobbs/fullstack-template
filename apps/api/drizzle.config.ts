import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env from project root
config({ path: '../../.env' });

export default defineConfig({
  schema: './dist/db/schema/index.js',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});

