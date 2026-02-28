# Seed Data Reference

> **[Template]** This covers the base template feature. Extend or modify for your project.

> Default seed data, credentials, and instructions for customizing the seed script.

---

## Overview

The seed script (`pnpm db:seed`) populates the database with required default data: system settings, permissions, roles, an admin user, and certificate profiles. The script is **idempotent** -- it is safe to run multiple times. Existing records are skipped (using `ON CONFLICT DO NOTHING`), and all operations run in a single transaction for atomicity.

**Source:** `apps/api/src/db/seeds/run-seed.ts`

---

## Running the Seed Script

```bash
# Ensure database is running
pnpm docker:up

# Apply migrations first
pnpm db:migrate

# Run the seed script
pnpm db:seed
```

The script logs progress for each category:
```
[INFO] Starting database seed...
[INFO] Seeding system settings...
[INFO] Settings: 7 added, 0 skipped
[INFO] Seeding permissions...
[INFO] Permissions: 35 added, 0 skipped
[INFO] Seeding roles...
[INFO] Roles: 5 added, 0 skipped, 35 permissions linked
[INFO] Checking for admin user...
[INFO] Created admin user: admin@app.local
[WARN] Default password is: Admin123!
[WARN] CHANGE THIS PASSWORD IMMEDIATELY!
[INFO] Assigned Super Admin role to admin@app.local
[INFO] Seeding certificate profiles...
[INFO] Certificate profiles: 5 added, 0 skipped
[INFO] Seeding complete!
```

---

## Default Admin Credentials

| Field | Value |
|-------|-------|
| **Email** | `admin@app.local` |
| **Password** | `Admin123!` |
| **Role** | Super Admin |
| **isAdmin** | `true` |
| **emailVerified** | `true` |

**IMPORTANT:** Change these credentials immediately after first deployment. The default password is intentionally weak and is documented publicly. In production, either:
1. Change the password via the Admin UI after first login
2. Modify the seed script constants before running in production
3. Use a separate provisioning script for production admin creation

---

## Seeded Data Reference

### System Settings

Defined in `apps/api/src/db/seeds/settings.ts`:

| Key | Value | Type | Category | Description |
|-----|-------|------|----------|-------------|
| `feature.registration_enabled` | `true` | boolean | features | Allow new user registrations |
| `feature.email_verification_required` | `false` | boolean | features | Require email verification before login |
| `email.from_name` | `App Name` | string | email | Sender name for system emails |
| `security.max_login_attempts` | `5` | number | security | Max failed attempts before lockout |
| `security.lockout_duration_minutes` | `15` | number | security | Lockout duration in minutes |
| `app.maintenance_mode` | `false` | boolean | general | Block non-admin access when enabled |
| `app.max_items_per_user` | `100` | number | general | Max items a user can create |

Settings can be modified at runtime via the Admin UI or the settings API.

### Permissions

Defined in `apps/api/src/db/seeds/permissions.ts`. Uses `resource:action` naming convention:

| Resource | Permissions |
|----------|------------|
| **users** | `users:read`, `users:create`, `users:update`, `users:delete` |
| **roles** | `roles:read`, `roles:create`, `roles:update`, `roles:delete` |
| **settings** | `settings:read`, `settings:update` |
| **audit** | `audit:read` |
| **api_keys** | `api_keys:read`, `api_keys:create`, `api_keys:update`, `api_keys:delete` |
| **service_accounts** | `service_accounts:read`, `service_accounts:create`, `service_accounts:update`, `service_accounts:delete` |
| **ca** | `ca:read`, `ca:create`, `ca:update` |
| **certificates** | `certificates:read`, `certificates:issue`, `certificates:revoke`, `certificates:renew`, `certificates:download` |
| **csr** | `csr:read`, `csr:submit`, `csr:approve` |
| **crl** | `crl:read`, `crl:generate` |
| **profiles** | `profiles:read`, `profiles:create`, `profiles:update`, `profiles:delete` |
| **pki_audit** | `pki_audit:read` |

**Total: 35 permissions**

### Roles

Defined in `apps/api/src/db/seeds/roles.ts`:

| Role | System? | Permissions | Description |
|------|---------|-------------|-------------|
| **Super Admin** | Yes | All 35 permissions | Full system access. Cannot be deleted or modified |
| **Admin** | No | users, roles:read, settings, audit, api_keys, service_accounts (16 permissions) | User management and system settings access |
| **User** | No | None (authenticated access only) | Standard authenticated user |
| **PKI Admin** | No | All ca, certificates, csr, crl, profiles, pki_audit (17 permissions) | Full PKI management |
| **PKI Operator** | No | ca:read, certificates (except download via admin), csr:approve, crl:read, profiles:read, pki_audit:read (11 permissions) | Day-to-day certificate operations |

The **Super Admin** role has `isSystem: true`, which prevents it from being deleted through the Admin UI or API.

### Certificate Profiles

Defined in `apps/api/src/db/seeds/certificate-profiles.ts`:

| Profile | Type | Key Algorithms | Min Key Size | Max Validity | Key Usage |
|---------|------|---------------|--------------|-------------|-----------|
| **TLS Server** | server | RSA, ECDSA | 2048 | 398 days | digitalSignature, keyEncipherment |
| **Client Authentication** | client | RSA, ECDSA | 2048 | 365 days | digitalSignature |
| **User Authentication** | user | RSA, ECDSA | 2048 | 365 days | digitalSignature, keyEncipherment |
| **Intermediate CA** | ca | RSA, ECDSA | 2048 | 3650 days | keyCertSign, cRLSign |
| **S/MIME Email** | smime | RSA, ECDSA | 2048 | 365 days | digitalSignature, keyEncipherment |

All built-in profiles have `isBuiltIn: true`, which prevents deletion.

### Admin User Migration

The seed script also runs `migrateExistingAdmins()`, which finds users with `isAdmin=true` who have no role assignments and assigns them the **Admin** role. This handles migration from the legacy `isAdmin` flag to the RBAC role system.

---

## Custom Seed Data

### Adding New Permissions

Add entries to the `defaultPermissions` array in `apps/api/src/db/seeds/permissions.ts`:

```typescript
{
  name: 'reports:read',
  description: 'View reports',
  resource: 'reports',
  action: 'read',
},
```

Also add the constant to the `PERMISSIONS` object at the bottom of the file:

```typescript
export const PERMISSIONS = {
  // ... existing ...
  REPORTS_READ: 'reports:read',
} as const;
```

### Adding New Roles

Add entries to the `defaultRoles` array in `apps/api/src/db/seeds/roles.ts`:

```typescript
{
  role: {
    name: 'Report Viewer',
    description: 'Access to view reports.',
    isSystem: false,
  },
  permissions: [
    PERMISSIONS.REPORTS_READ,
  ],
},
```

### Adding New Settings

Add entries to the `defaultSettings` array in `apps/api/src/db/seeds/settings.ts`:

```typescript
{
  key: 'feature.reports_enabled',
  value: 'true',
  type: 'boolean',
  category: 'features',
  description: 'Enable the reports feature',
},
```

### Adding Custom Certificate Profiles

Add entries to the `builtInProfiles` array in `apps/api/src/db/seeds/certificate-profiles.ts`, or create custom profiles through the Admin UI (which are not seeded but stored in the database).

---

## Environment-Specific Seeding

### Development

The default seed script is designed for development. Run as-is:

```bash
pnpm db:seed
```

### Staging

Use the same seed script, but change the admin password immediately after seeding:

```bash
pnpm db:seed
# Then change admin password via API or Admin UI
```

### Production

For production, consider these approaches:

1. **Modified seed script:** Change `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in the seed script (or read from environment variables) before running
2. **Separate provisioning:** Use a dedicated production provisioning script that creates the admin with a strong, randomly generated password
3. **Seed then rotate:** Run the standard seed, then immediately change credentials via the API

```bash
# Option: Read admin credentials from environment
DEFAULT_ADMIN_EMAIL="${ADMIN_EMAIL:-admin@app.local}"
DEFAULT_ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 32)}"
```

---

## Troubleshooting

### "Seed failed -- transaction rolled back"

The entire seed operation runs in a single transaction. If any step fails, everything is rolled back. Check the error message for the specific failure:

- **Connection refused:** Ensure the database is running (`pnpm docker:up`)
- **Relation does not exist:** Run migrations first (`pnpm db:migrate`)
- **Duplicate key:** Should not happen due to `ON CONFLICT DO NOTHING`, but if it does, check for manual data conflicts

### "Permission not found" Warning

If you add a new role that references a permission not yet in the `defaultPermissions` array, the seed script will log a warning and skip that permission assignment. Add the permission first.

### Re-seeding After Schema Changes

After adding new schema tables that require seed data:
1. Add the seed data to the appropriate file (or create a new one)
2. Import and call the new seed function in `run-seed.ts`
3. Run `pnpm db:seed` -- existing data will be skipped, only new data is inserted

---

## Related Documentation

- [Database Operations Index](./README.md) - Overview of database documentation
- [Migrations](./migrations.md) - Schema changes before seeding
- [Admin Guide](../../product/admin-guide.md) - Managing settings, roles, and permissions via the UI
