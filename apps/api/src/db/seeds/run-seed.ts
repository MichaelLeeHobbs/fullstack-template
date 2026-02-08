// ===========================================
// Database Seed Script
// ===========================================
// Seeds default system settings, permissions, roles, and initial admin.
// Run with: pnpm db:seed
// This script is idempotent - safe to run multiple times.

import bcrypt from 'bcrypt';
import { db } from '../../lib/db.js';
import {
  permissions,
  rolePermissions,
  roles,
  systemSettings,
  userRoles,
  users,
} from '../schema/index.js';
import { defaultSettings } from './settings.js';
import { defaultPermissions } from './permissions.js';
import { defaultRoles, ROLES } from './roles.js';
import logger from '../../lib/logger.js';
import { and, eq } from 'drizzle-orm';
import { stderr } from 'stderr-lib';

const SALT_ROUNDS = 12;

// Default admin credentials - CHANGE THESE IN PRODUCTION
const DEFAULT_ADMIN_EMAIL = 'admin@app.local';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';

async function seedSettings() {
  logger.info('Seeding system settings...');

  let seeded = 0;
  let skipped = 0;

  for (const setting of defaultSettings) {
    try {
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
    } catch (error) {
      logger.warn({ error: stderr(error).toString() }, `Failed to seed setting: ${setting.key}`);
    }
  }

  logger.info(`Settings: ${seeded} added, ${skipped} skipped`);
}

async function seedPermissions() {
  logger.info('Seeding permissions...');

  let seeded = 0;
  let skipped = 0;

  for (const permission of defaultPermissions) {
    try {
      const result = await db
        .insert(permissions)
        .values(permission)
        .onConflictDoNothing({ target: permissions.name })
        .returning({ name: permissions.name });

      if (result.length > 0) {
        seeded++;
        logger.debug(`Seeded permission: ${permission.name}`);
      } else {
        skipped++;
        logger.debug(`Skipped (exists): ${permission.name}`);
      }
    } catch (error) {
      logger.warn(
        { error: stderr(error).toString() },
        `Failed to seed permission: ${permission.name}`
      );
    }
  }

  logger.info(`✅ Permissions: ${seeded} added, ${skipped} skipped`);
}

async function seedRoles() {
  logger.info('🌱 Seeding roles...');

  let rolesSeeded = 0;
  let rolesSkipped = 0;
  let permissionsLinked = 0;

  for (const { role, permissions: permissionNames } of defaultRoles) {
    try {
      // Insert role if not exists
      const [existingRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, role.name));

      let roleId: string;

      if (existingRole) {
        roleId = existingRole.id;
        rolesSkipped++;
        logger.debug(`Skipped role (exists): ${role.name}`);
      } else {
        const [newRole] = await db.insert(roles).values(role).returning({ id: roles.id });
        if (!newRole) {
          logger.error(`Failed to seed role: ${role.name}`);
          continue;
        }
        roleId = newRole.id;
        rolesSeeded++;
        logger.debug(`Seeded role: ${role.name}`);
      }

      // Link permissions to role
      for (const permissionName of permissionNames) {
        try {
          const [permission] = await db
            .select({ id: permissions.id })
            .from(permissions)
            .where(eq(permissions.name, permissionName));

          if (!permission) {
            logger.warn(`Permission not found: ${permissionName}`);
            continue;
          }

          // Check if link already exists
          const [existingLink] = await db
            .select({ roleId: rolePermissions.roleId })
            .from(rolePermissions)
            .where(
              and(
                eq(rolePermissions.roleId, roleId),
                eq(rolePermissions.permissionId, permission.id)
              )
            );

          if (!existingLink) {
            await db.insert(rolePermissions).values({
              roleId,
              permissionId: permission.id,
            });
            permissionsLinked++;
          }
        } catch (error) {
          logger.warn(
            { error: stderr(error).toString() },
            `Failed to link permission ${permissionName} to role ${role.name}`
          );
        }
      }
    } catch (error) {
      logger.warn({ error: stderr(error).toString() }, `Failed to seed role: ${role.name}`);
    }
  }

  logger.info(
    `✅ Roles: ${rolesSeeded} added, ${rolesSkipped} skipped, ${permissionsLinked} permissions linked`
  );
}

async function seedAdminUser() {
  logger.info('🌱 Checking for admin user...');

  try {
    // Check if admin already exists
    const [existingAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, DEFAULT_ADMIN_EMAIL));

    let adminId: string;

    if (existingAdmin) {
      adminId = existingAdmin.id;
      logger.info(`⏭️  Admin user already exists: ${DEFAULT_ADMIN_EMAIL}`);
    } else {
      // Create admin user with email already verified
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, SALT_ROUNDS);

      const [newAdmin] = await db
        .insert(users)
        .values({
          email: DEFAULT_ADMIN_EMAIL,
          passwordHash,
          isAdmin: true, // Keep for backwards compatibility
          emailVerified: true, // Admin starts verified
        })
        .returning({ id: users.id });

      if (!newAdmin) {
        logger.error('Failed to create admin user');
        return;
      }

      adminId = newAdmin.id;
      logger.info(`✅ Created admin user: ${DEFAULT_ADMIN_EMAIL}`);
      logger.warn(`⚠️  Default password is: ${DEFAULT_ADMIN_PASSWORD}`);
      logger.warn(`⚠️  CHANGE THIS PASSWORD IMMEDIATELY!`);
    }

    // Assign Super Admin role to admin user
    const [superAdminRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, ROLES.SUPER_ADMIN));

    if (superAdminRole) {
      const [existingUserRole] = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(and(eq(userRoles.userId, adminId), eq(userRoles.roleId, superAdminRole.id)));

      if (!existingUserRole) {
        await db.insert(userRoles).values({
          userId: adminId,
          roleId: superAdminRole.id,
        });
        logger.info(`✅ Assigned Super Admin role to ${DEFAULT_ADMIN_EMAIL}`);
      } else {
        logger.debug(`Admin already has Super Admin role`);
      }
    }
  } catch (error) {
    // debugging logger
    logger.error({ error: stderr(error).toString() }, 'Failed to seed admin user');
  }
}

async function migrateExistingAdmins() {
  logger.info('🌱 Migrating existing admin users to Admin role...');

  try {
    // Get Admin role
    const [adminRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, ROLES.ADMIN));

    if (!adminRole) {
      logger.warn('Admin role not found, skipping migration');
      return;
    }

    // Find users with isAdmin=true who don't have any roles
    const adminUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.isAdmin, true));

    let migrated = 0;

    for (const user of adminUsers) {
      try {
        // Check if user already has any role
        const [existingRole] = await db
          .select({ roleId: userRoles.roleId })
          .from(userRoles)
          .where(eq(userRoles.userId, user.id));

        if (!existingRole) {
          await db.insert(userRoles).values({
            userId: user.id,
            roleId: adminRole.id,
          });
          migrated++;
          logger.debug(`Migrated admin user: ${user.email}`);
        }
      } catch (error) {
        logger.warn(
          { error: stderr(error).toString() },
          `Failed to migrate admin user: ${user.email}`
        );
      }
    }

    if (migrated > 0) {
      logger.info(`Migrated ${migrated} existing admin users to Admin role`);
    }
  } catch (error) {
    logger.error({ error: stderr(error).toString() }, 'Failed to migrate existing admins');
  }
}

async function seed() {
  logger.info('🌱 Starting database seed...');

  await seedSettings();
  await seedPermissions();
  await seedRoles();
  await seedAdminUser();
  await migrateExistingAdmins();

  logger.info('✅ Seeding complete!');
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    // Log full error with stack trace
    logger.error({ error: stderr(error).toString() }, 'Seed failed');
    process.exit(1);
  });
