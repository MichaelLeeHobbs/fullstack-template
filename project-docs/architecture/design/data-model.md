# Data Model -- Entity Relationship Diagram

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Overview

The Fullstack Template database consists of 23 tables organized into four domains:

1. **Identity and Access Management (IAM)** -- Users, sessions, tokens, MFA, roles, permissions, API keys
2. **Application** -- Audit logs, notifications, system settings
3. **PKI / Certificate Authority** -- CAs, certificates, profiles, CSRs, CRLs, revocations, private keys
4. **PKI User Binding** -- User certificates, attach codes, PKI audit logs

All tables use UUID primary keys (auto-generated), timestamptz for temporal columns, and follow Drizzle ORM conventions.

## Full ERD

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1e3a5f', 'primaryTextColor': '#e0e0e0', 'primaryBorderColor': '#4fc3f7', 'lineColor': '#81d4fa', 'secondaryColor': '#2e4057', 'tertiaryColor': '#1a2332', 'noteTextColor': '#e0e0e0', 'noteBkgColor': '#2e4057', 'noteBorderColor': '#4fc3f7'}}}%%

erDiagram
    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar account_type "user | service"
        boolean is_admin
        boolean is_active
        boolean email_verified
        jsonb preferences
        integer failed_login_attempts
        timestamptz locked_until
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }

    sessions {
        uuid id PK
        uuid user_id FK
        varchar refresh_token UK
        varchar user_agent
        varchar ip_address
        timestamptz last_used_at
        timestamptz expires_at
        timestamptz created_at
    }

    email_verification_tokens {
        uuid id PK
        uuid user_id FK
        varchar token UK
        timestamptz expires_at
        timestamptz created_at
    }

    password_reset_tokens {
        uuid id PK
        uuid user_id FK
        varchar token UK
        timestamptz expires_at
        timestamptz created_at
    }

    user_mfa_methods {
        uuid id PK
        uuid user_id FK
        varchar method "totp"
        jsonb config "secret + backupCodes"
        boolean is_enabled
        boolean is_verified
        timestamptz created_at
        timestamptz updated_at
    }

    roles {
        uuid id PK
        varchar name UK
        varchar description
        boolean is_system
        timestamptz created_at
        timestamptz updated_at
    }

    permissions {
        uuid id PK
        varchar name UK "resource:action"
        varchar description
        varchar resource
        varchar action
        timestamptz created_at
    }

    role_permissions {
        uuid role_id PK_FK
        uuid permission_id PK_FK
    }

    user_roles {
        uuid user_id PK_FK
        uuid role_id PK_FK
        timestamptz created_at
    }

    api_keys {
        uuid id PK
        uuid user_id FK
        varchar name
        varchar prefix
        varchar key_hash UK
        timestamptz expires_at
        boolean is_active
        timestamptz last_used_at
        timestamptz created_at
        timestamptz updated_at
    }

    api_key_permissions {
        uuid api_key_id PK_FK
        uuid permission_id PK_FK
    }

    audit_logs {
        uuid id PK
        uuid user_id FK "nullable"
        varchar action
        varchar ip_address
        varchar user_agent
        text details
        boolean success
        timestamptz created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        varchar title
        text body
        varchar type "info|success|warning|error|system"
        varchar category "account|security|admin|system|general"
        varchar link
        jsonb metadata
        timestamptz read_at
        timestamptz created_at
    }

    system_settings {
        uuid id PK
        varchar key UK
        text value
        setting_type type "string|number|boolean|json"
        text description
        varchar category
        timestamptz created_at
        timestamptz updated_at
    }

    pki_private_keys {
        uuid id PK
        varchar algorithm "rsa | ecdsa"
        integer key_size
        varchar curve
        text encrypted_private_key_pem
        text public_key_pem
        varchar key_fingerprint UK
        varchar kdf_salt
        varchar kdf_iv
        varchar kdf_tag
        timestamptz created_at
    }

    certificate_authorities {
        uuid id PK
        varchar name UK
        varchar common_name
        varchar organization
        varchar organizational_unit
        varchar country
        varchar state
        varchar locality
        uuid parent_ca_id FK "self-ref nullable"
        boolean is_root
        integer path_len_constraint
        uuid certificate_id FK "nullable"
        uuid private_key_id FK
        varchar status "active|suspended|retired"
        integer serial_counter
        integer max_validity_days
        varchar crl_distribution_url
        varchar ocsp_url
        timestamptz created_at
        timestamptz updated_at
    }

    certificate_profiles {
        uuid id PK
        varchar name UK
        text description
        varchar cert_type "server|client|user|ca|smime"
        jsonb allowed_key_algorithms
        integer min_key_size
        jsonb key_usage
        jsonb ext_key_usage
        jsonb basic_constraints
        integer max_validity_days
        jsonb subject_constraints
        jsonb san_constraints
        boolean is_built_in
        timestamptz created_at
        timestamptz updated_at
    }

    certificates {
        uuid id PK
        uuid issuing_ca_id FK
        varchar serial_number
        varchar common_name
        varchar organization
        varchar organizational_unit
        varchar country
        varchar state
        varchar locality
        jsonb sans
        text certificate_pem
        varchar fingerprint UK
        timestamptz not_before
        timestamptz not_after
        varchar cert_type
        varchar status "active|revoked|expired|suspended"
        uuid profile_id FK "nullable"
        uuid private_key_id FK "nullable"
        timestamptz created_at
    }

    certificate_requests {
        uuid id PK
        text csr_pem
        varchar common_name
        varchar subject_dn
        jsonb sans
        uuid target_ca_id FK
        uuid profile_id FK "nullable"
        varchar status "pending|approved|rejected"
        uuid certificate_id FK "nullable"
        uuid requested_by FK
        uuid approved_by FK "nullable"
        text rejection_reason
        timestamptz created_at
        timestamptz updated_at
    }

    user_certificates {
        uuid id PK
        uuid user_id FK
        varchar certificate_dn
        varchar certificate_cn
        varchar certificate_serial
        varchar certificate_fingerprint
        timestamptz expires_at
        uuid certificate_id FK "nullable"
        varchar status "active|revoked|expired"
        varchar label
        timestamptz created_at
    }

    cert_attach_codes {
        uuid id PK
        uuid user_id FK
        uuid code UK
        timestamptz expires_at
        boolean used
        timestamptz used_at
        timestamptz created_at
    }

    revocations {
        uuid id PK
        uuid certificate_id FK_UK
        varchar reason "RFC 5280 reason code"
        timestamptz revoked_at
        timestamptz invalidity_date
        uuid revoked_by FK "nullable"
        timestamptz created_at
    }

    crls {
        uuid id PK
        uuid ca_id FK
        integer crl_number
        text crl_pem
        timestamptz this_update
        timestamptz next_update
        integer entries_count
        timestamptz created_at
    }

    pki_audit_logs {
        uuid id PK
        varchar action
        uuid actor_id FK "nullable"
        varchar actor_ip
        varchar target_type
        uuid target_id
        jsonb details
        boolean success
        text error_message
        timestamptz created_at
    }

    %% === IAM Relationships ===
    users ||--o{ sessions : "has many"
    users ||--o{ email_verification_tokens : "has many"
    users ||--o{ password_reset_tokens : "has many"
    users ||--o{ user_mfa_methods : "has many"
    users ||--o{ user_roles : "has many"
    users ||--o{ api_keys : "has many"
    users ||--o{ audit_logs : "tracked in"
    users ||--o{ notifications : "receives"

    roles ||--o{ user_roles : "assigned via"
    roles ||--o{ role_permissions : "grants"
    permissions ||--o{ role_permissions : "granted by"
    permissions ||--o{ api_key_permissions : "scoped to"
    api_keys ||--o{ api_key_permissions : "scoped by"

    %% === PKI Relationships ===
    certificate_authorities ||--o{ certificate_authorities : "parent-child"
    certificate_authorities ||--o{ certificates : "issues"
    certificate_authorities ||--o{ certificate_requests : "target of"
    certificate_authorities ||--o{ crls : "publishes"

    pki_private_keys ||--o{ certificate_authorities : "used by"
    pki_private_keys ||--o{ certificates : "used by"

    certificate_profiles ||--o{ certificates : "template for"
    certificate_profiles ||--o{ certificate_requests : "template for"

    certificates ||--o| revocations : "may have"
    certificates ||--o{ user_certificates : "bound to"
    certificates ||--o{ certificate_requests : "produced from"

    users ||--o{ certificate_requests : "requested by"
    users ||--o{ certificate_requests : "approved by"
    users ||--o{ user_certificates : "owns"
    users ||--o{ cert_attach_codes : "generates"
    users ||--o{ revocations : "revoked by"
    users ||--o{ pki_audit_logs : "actor in"
```

## Domain Breakdown

### 1. Identity and Access Management (IAM)

#### users

The central identity table. Supports both human users and service accounts via the `account_type` discriminator.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, auto | Unique user identifier |
| `email` | varchar(255) | UNIQUE, NOT NULL | Login identifier |
| `password_hash` | varchar(255) | nullable | bcrypt hash (null for cert-only accounts) |
| `account_type` | varchar(20) | NOT NULL, default `'user'` | `'user'` or `'service'` |
| `is_admin` | boolean | NOT NULL, default `false` | Global admin flag |
| `is_active` | boolean | NOT NULL, default `true` | Account enabled/disabled |
| `email_verified` | boolean | NOT NULL, default `false` | Email verification status |
| `preferences` | jsonb | NOT NULL | User preferences (theme, etc.) |
| `failed_login_attempts` | integer | NOT NULL, default `0` | Lockout counter |
| `locked_until` | timestamptz | nullable | Account lockout expiry |
| `last_login_at` | timestamptz | nullable | Last successful login |
| `created_at` | timestamptz | NOT NULL | Record creation time |
| `updated_at` | timestamptz | NOT NULL | Last modification time |

**Indexes:** `users_is_active_idx`
**Constraints:** `users_account_type_check` (IN `'user'`, `'service'`)

#### sessions

Stores active refresh token sessions. Each login creates a new session. Sessions can be individually revoked.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, auto | Session identifier |
| `user_id` | uuid | FK -> users, CASCADE | Owning user |
| `refresh_token` | varchar(500) | UNIQUE, NOT NULL | Refresh token value |
| `user_agent` | varchar(500) | nullable | Browser/client user agent |
| `ip_address` | varchar(45) | nullable | Client IP (IPv4/IPv6) |
| `last_used_at` | timestamptz | nullable | Last token refresh time |
| `expires_at` | timestamptz | NOT NULL | Session expiry |
| `created_at` | timestamptz | NOT NULL | Session creation time |

**Indexes:** `sessions_user_id_idx`, `sessions_expires_at_idx`

#### email_verification_tokens / password_reset_tokens

One-time tokens for email verification and password reset flows. Structurally identical.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, auto | Token record identifier |
| `user_id` | uuid | FK -> users, CASCADE | Target user |
| `token` | varchar(255) | UNIQUE, NOT NULL | Token value (hashed) |
| `expires_at` | timestamptz | NOT NULL | Token expiry |
| `created_at` | timestamptz | NOT NULL | Token creation time |

#### user_mfa_methods

Generic MFA method storage. Currently supports TOTP; designed for extension to WebAuthn, hardware keys, etc.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, auto | MFA method identifier |
| `user_id` | uuid | FK -> users, CASCADE | Owning user |
| `method` | varchar(50) | NOT NULL | Method type (e.g., `'totp'`) |
| `config` | jsonb | NOT NULL | Method-specific config (secret, backup codes) |
| `is_enabled` | boolean | NOT NULL, default `false` | Whether method is active |
| `is_verified` | boolean | NOT NULL, default `false` | Whether setup is complete |
| `created_at` | timestamptz | NOT NULL | Creation time |
| `updated_at` | timestamptz | NOT NULL | Last modification |

**Unique:** `(user_id, method)` -- one method per type per user

#### roles / permissions / role_permissions / user_roles

RBAC system with many-to-many relationships. Permissions use `resource:action` naming (e.g., `users:read`). System roles cannot be deleted.

**roles:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Role identifier |
| `name` | varchar(100) UK | Role display name |
| `description` | varchar(255) | Human description |
| `is_system` | boolean | Protected from deletion |

**permissions:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Permission identifier |
| `name` | varchar(100) UK | e.g., `'users:read'` |
| `resource` | varchar(50) | Resource name |
| `action` | varchar(50) | Action name |

**role_permissions:** Composite PK `(role_id, permission_id)`
**user_roles:** Composite PK `(user_id, role_id)` + `created_at`

#### api_keys / api_key_permissions

API keys for programmatic access. Keys are SHA-256 hashed; only the prefix is stored in plaintext for identification.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | API key identifier |
| `user_id` | uuid FK | Owning user |
| `name` | varchar(100) | Human-friendly key name |
| `prefix` | varchar(8) | Key prefix for identification |
| `key_hash` | varchar(255) UK | SHA-256 hash of full key |
| `expires_at` | timestamptz | Optional key expiry |
| `is_active` | boolean | Key enabled/disabled |
| `last_used_at` | timestamptz | Last usage timestamp |

**api_key_permissions:** Composite PK `(api_key_id, permission_id)` -- scopes key to specific permissions

### 2. Application

#### audit_logs

Security event logging for IAM operations. Immutable append-only table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Log entry identifier |
| `user_id` | uuid FK (SET NULL) | Acting user (null if system) |
| `action` | varchar(50) | Action type (e.g., `LOGIN_SUCCESS`) |
| `ip_address` | varchar(45) | Client IP |
| `user_agent` | varchar(500) | Client user agent |
| `details` | text | Additional context |
| `success` | boolean | Whether action succeeded |
| `created_at` | timestamptz | Event timestamp |

**Indexes:** `user_id`, `created_at`, `action`

#### notifications

In-app notification system with real-time delivery via Socket.IO.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Notification identifier |
| `user_id` | uuid FK (CASCADE) | Recipient user |
| `title` | varchar(255) | Notification title |
| `body` | text | Notification body |
| `type` | varchar(20) | `info`, `success`, `warning`, `error`, `system` |
| `category` | varchar(30) | `account`, `security`, `admin`, `system`, `general` |
| `link` | varchar(500) | Optional navigation link |
| `metadata` | jsonb | Arbitrary structured data |
| `read_at` | timestamptz | Null if unread |
| `created_at` | timestamptz | Creation timestamp |

#### system_settings

Runtime-configurable application settings. Used for feature flags, UI configuration, and other settings that should be changeable without redeployment.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Setting identifier |
| `key` | varchar(255) UK | Dot-notation key (e.g., `feature.ai_enabled`) |
| `value` | text | Setting value (parsed based on type) |
| `type` | enum | `string`, `number`, `boolean`, `json` |
| `description` | text | Human-readable description |
| `category` | varchar(100) | Grouping category |

### 3. PKI / Certificate Authority

#### pki_private_keys

Encrypted private key storage. Keys are encrypted with AES-256-GCM using a KDF derived from the application secret.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Key identifier |
| `algorithm` | varchar(20) | `rsa` or `ecdsa` |
| `key_size` | integer | RSA key size (e.g., 2048, 4096) |
| `curve` | varchar(20) | ECDSA curve (e.g., `P-256`) |
| `encrypted_private_key_pem` | text | AES-256-GCM encrypted PEM |
| `public_key_pem` | text | Public key PEM (unencrypted) |
| `key_fingerprint` | varchar(128) UK | SHA-256 fingerprint |
| `kdf_salt` | varchar(255) | KDF salt |
| `kdf_iv` | varchar(255) | AES initialization vector |
| `kdf_tag` | varchar(255) | GCM authentication tag |

#### certificate_authorities

CA hierarchy supporting root and intermediate CAs. Self-referential `parent_ca_id` for hierarchy.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | CA identifier |
| `name` | varchar(255) UK | Human-friendly CA name |
| `common_name` | varchar(255) | X.500 CN |
| `organization` | varchar(255) | X.500 O |
| `organizational_unit` | varchar(255) | X.500 OU |
| `country` | varchar(2) | X.500 C |
| `state` | varchar(128) | X.500 ST |
| `locality` | varchar(128) | X.500 L |
| `parent_ca_id` | uuid FK (self) | Parent CA (null for root) |
| `is_root` | boolean | Root CA flag |
| `path_len_constraint` | integer | X.509 path length |
| `certificate_id` | uuid | CA's own certificate |
| `private_key_id` | uuid FK | Signing key |
| `status` | varchar(20) | `active`, `suspended`, `retired` |
| `serial_counter` | integer | Next serial number |
| `max_validity_days` | integer | Maximum cert validity |
| `crl_distribution_url` | varchar(500) | CRL CDP |
| `ocsp_url` | varchar(500) | OCSP responder URL |

#### certificates

Issued X.509 certificates with full subject information and lifecycle tracking.

Key columns: `issuing_ca_id` (FK -> CAs), `serial_number`, full X.500 subject fields, `sans` (JSONB), `certificate_pem`, `fingerprint` (UK), `not_before`/`not_after`, `cert_type`, `status`, `profile_id`, `private_key_id`.

#### certificate_profiles

Certificate templates defining key usage, validity, and constraints for different certificate types.

Key columns: `name` (UK), `cert_type`, `allowed_key_algorithms` (JSONB), `min_key_size`, `key_usage` (JSONB), `ext_key_usage` (JSONB), `basic_constraints` (JSONB), `max_validity_days`, `subject_constraints` (JSONB), `san_constraints` (JSONB), `is_built_in`.

#### certificate_requests

CSR submission and approval workflow. Tracks the full lifecycle from submission through approval/rejection to certificate issuance.

Key columns: `csr_pem`, `common_name`, `subject_dn`, `sans` (JSONB), `target_ca_id` (FK), `profile_id` (FK), `status`, `certificate_id` (FK, set on approval), `requested_by` (FK), `approved_by` (FK), `rejection_reason`.

#### revocations

Certificate revocation records using RFC 5280 reason codes. One-to-one with certificates (unique `certificate_id`).

Key columns: `certificate_id` (FK, UNIQUE), `reason` (RFC 5280), `revoked_at`, `invalidity_date`, `revoked_by` (FK).

#### crls

Certificate Revocation Lists published by each CA. Unique on `(ca_id, crl_number)`.

Key columns: `ca_id` (FK), `crl_number`, `crl_pem`, `this_update`, `next_update`, `entries_count`.

### 4. PKI User Binding

#### user_certificates

Maps user accounts to their client certificates for certificate-based authentication.

Key columns: `user_id` (FK), `certificate_dn`, `certificate_cn`, `certificate_serial`, `certificate_fingerprint`, `expires_at`, `certificate_id` (FK, nullable), `status`, `label`.

#### cert_attach_codes

One-time codes for binding client certificates to user accounts. Generated by user, redeemed during certificate authentication.

Key columns: `user_id` (FK), `code` (UUID, UNIQUE), `expires_at`, `used`, `used_at`.

#### pki_audit_logs

PKI-specific audit trail for compliance. Separate from the general `audit_logs` table to allow specialized indexing and retention.

Key columns: `action`, `actor_id` (FK), `actor_ip`, `target_type`, `target_id`, `details` (JSONB), `success`, `error_message`.

## Table Count Summary

| Domain | Tables | Table Names |
|--------|--------|-------------|
| IAM | 9 | users, sessions, email_verification_tokens, password_reset_tokens, user_mfa_methods, roles, permissions, role_permissions, user_roles |
| API Access | 2 | api_keys, api_key_permissions |
| Application | 3 | audit_logs, notifications, system_settings |
| PKI Core | 6 | pki_private_keys, certificate_authorities, certificates, certificate_profiles, certificate_requests, revocations |
| PKI Distribution | 1 | crls |
| PKI User Binding | 3 | user_certificates, cert_attach_codes, pki_audit_logs |
| **Total** | **24** | |

## Cascade and Deletion Rules

| FK Relationship | On Delete | Rationale |
|----------------|-----------|-----------|
| sessions.user_id -> users | CASCADE | Sessions are meaningless without a user |
| tokens.user_id -> users | CASCADE | Tokens are meaningless without a user |
| user_mfa_methods.user_id -> users | CASCADE | MFA config belongs to user |
| user_roles.user_id -> users | CASCADE | Role assignment belongs to user |
| user_roles.role_id -> roles | CASCADE | Remove assignment when role deleted |
| role_permissions.role_id -> roles | CASCADE | Remove grants when role deleted |
| role_permissions.permission_id -> permissions | CASCADE | Remove grants when permission deleted |
| api_keys.user_id -> users | CASCADE | Keys belong to user |
| api_key_permissions -> api_keys/permissions | CASCADE | Remove scope when key or permission deleted |
| audit_logs.user_id -> users | SET NULL | Preserve audit trail even if user deleted |
| notifications.user_id -> users | CASCADE | Notifications belong to user |
| certificates.issuing_ca_id -> CAs | NO ACTION | Prevent orphaned certificates |
| certificates.profile_id -> profiles | SET NULL | Allow profile deletion |
| certificate_requests.requested_by -> users | CASCADE | Requests belong to user |
| certificate_requests.approved_by -> users | SET NULL | Preserve approval record |
| revocations.certificate_id -> certificates | NO ACTION | Prevent orphaned revocations |
| revocations.revoked_by -> users | SET NULL | Preserve revocation record |
| crls.ca_id -> CAs | NO ACTION | Prevent orphaned CRLs |
| pki_audit_logs.actor_id -> users | SET NULL | Preserve audit trail |
