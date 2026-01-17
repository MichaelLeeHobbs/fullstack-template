// ===========================================
// Database Seed Script
// ===========================================
// Seeds default system settings and creates initial admin.
// Run with: pnpm db:seed

import bcrypt from 'bcrypt';
import { db } from '../../lib/db.js';
import { systemSettings, users } from '../schema/index.js';
import { defaultSettings } from './settings.js';
import logger from '../../lib/logger.js';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 12;

// Default admin credentials - CHANGE THESE IN PRODUCTION
const DEFAULT_ADMIN_EMAIL = 'admin@app.local';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';

async function seedSettings() {
  logger.info('🌱 Seeding system settings...');

  let seeded = 0;
  let skipped = 0;

  for (const setting of defaultSettings) {
    const result = await db
      .insert(systemSettings)
      .values(setting)
      .onConflictDoNothing({ target: systemSettings.key })
      .returning({ key: systemSettings.key });

    if (result.length > 0) {
      seeded++;
      logger.debug(`Seeded: ${setting.key}`);
    } else {
      skipped++;
      logger.debug(`Skipped (exists): ${setting.key}`);
    }
  }

  logger.info(`✅ Settings: ${seeded} added, ${skipped} skipped`);
}

async function seedAdminUser() {
  logger.info('🌱 Checking for admin user...');

  // Check if admin already exists
  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEFAULT_ADMIN_EMAIL));

  if (existingAdmin) {
    logger.info(`⏭️  Admin user already exists: ${DEFAULT_ADMIN_EMAIL}`);
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, SALT_ROUNDS);

  await db.insert(users).values({
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash,
    isAdmin: true,
  });

  logger.info(`✅ Created admin user: ${DEFAULT_ADMIN_EMAIL}`);
  logger.warn(`⚠️  Default password is: ${DEFAULT_ADMIN_PASSWORD}`);
  logger.warn(`⚠️  CHANGE THIS PASSWORD IMMEDIATELY!`);
}

async function seed() {
  logger.info('🌱 Starting database seed...');

  await seedSettings();
  await seedAdminUser();

  logger.info('✅ Seeding complete!');
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Seed failed', { error: String(error) });
    process.exit(1);
  });

