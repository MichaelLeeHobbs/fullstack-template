// ===========================================
// SQL Script Runner
// ===========================================
// Executes all .sql files in this directory against the database.
// Scripts must be idempotent (safe to run multiple times).
//
// Usage: tsx src/db/scripts/run-scripts.ts

import { config as loadEnv } from 'dotenv';
import pg from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

loadEnv({ path: '../../.env' });
loadEnv({ path: '.env' });

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const files = (await readdir(__dirname))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No .sql scripts found');
    return;
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const file of files) {
      const sql = await readFile(join(__dirname, file), 'utf-8');
      console.log(`Running ${file}...`);
      await client.query(sql);
      console.log(`  ✓ ${file}`);
    }
    console.log(`\nDone — ${files.length} script(s) applied.`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Script runner failed:', err);
  process.exit(1);
});
