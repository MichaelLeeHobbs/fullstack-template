# Certificate Authority Management System — Design Document

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Background & Prior Art](#3-background--prior-art)
4. [System Architecture](#4-system-architecture)
5. [PKI Hierarchy](#5-pki-hierarchy)
6. [Data Model](#6-data-model)
7. [Certificate Profiles](#7-certificate-profiles)
8. [Certificate Lifecycle](#8-certificate-lifecycle)
9. [Certificate-Based Login](#9-certificate-based-login)
10. [API Design](#10-api-design)
11. [Web UI](#11-web-ui)
12. [Security Considerations](#12-security-considerations)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Production Readiness](#14-production-readiness)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

This document describes a web-based Certificate Authority (CA) management system built on the fullstack-template (Express + PostgreSQL + React). The system provides a multi-tier PKI hierarchy, full certificate lifecycle management, and a browser-based admin UI.

It also includes certificate-based user login using an mTLS authentication pattern (inspired by production implementations) — where NGINX terminates client TLS, extracts certificate fields into HTTP headers, and the backend matches those fields to user accounts.

**Key capabilities:**

- Create and manage Root CAs, Intermediate CAs, and end-entity certificates
- Issue server (TLS), client (mTLS), and user authentication certificates
- Certificate profiles/templates for standardized issuance
- CSR-based and direct issuance workflows
- CRL generation and OCSP responder
- Certificate-based user login with optional second-factor enforcement
- Audit logging of all PKI operations
- Web-based admin dashboard

---

## 2. Goals & Non-Goals

### Goals

- **G1**: Multi-tier PKI hierarchy (Root → Intermediate → End-Entity)
- **G2**: Certificate lifecycle management (issue, renew, revoke, expire)
- **G3
  **: Web UI for CA administration (no CLI dependency for routine operations)
- **G4**: Certificate-based login for end users (mTLS via reverse proxy)
- **G5**: Configurable certificate profiles/templates
- **G6**: CRL generation and distribution
- **G7**: Comprehensive audit trail for all PKI operations
- **G8**: Database-backed certificate storage with PostgreSQL/Drizzle
- **G9**: Import/export capabilities for interoperability with external CAs and certificates

### Non-Goals

- **NG1
  **: Public CA / WebTrust compliance (this is for internal/private PKI only)
- **NG2**: ACME protocol support (could be added later)
- **NG3
  **: HSM integration in v1 (design for it, implement as file-based keys initially)
- **NG4**: OCSP responder in v1 (CRL-only initially; OCSP is a follow-up)
- **NG5**: Certificate Transparency log submission
- **NG6**: Post-quantum cryptography support

---

## 3. Background & Prior Art

The following systems were studied as reference implementations. This design borrows proven patterns from each but is a standalone system built for the fullstack-template.

### Wormhole-Certs (Reference: CLI-Based CA Management)

A TypeScript CLI tool that wraps OpenSSL commands for managing a single-tier CA. Key patterns borrowed:

- **OpenSSL extension profiles** for client vs server certificates
- **Audit logging** of every CA operation with timestamps and actor info
- **Git + S3 backup** pattern for disaster recovery of key material
- **Lessons learned**: Single-tier hierarchy, flat-file storage, and CLI-only access don't scale — motivating this system's web UI, database-backed storage, and multi-tier hierarchy

### Portal Server (Reference: Certificate-Based Login)

A production Node.js/Express application that implements mTLS-based user authentication. Key patterns borrowed:

- **NGINX mTLS termination** passing certificate fields as HTTP headers (`x-ssl-user-dn`, `x-ssl-cn`, `x-ssl-serial`, `x-ssl-authenticated`, `x-ssl-expiration`)
- **Certificate-to-account binding** via stored DN/CN/serial fields matched at login time
- **One-time code attachment flow** for users to bind a certificate to their account
- **Policy-based auth control** at multiple levels (organization, role, user) determining whether cert login is required/optional and whether a second factor is needed

### Industry Tools Reviewed

| Tool          | Key Takeaway for Our Design                                                                   |
|---------------|-----------------------------------------------------------------------------------------------|
| **EJBCA**     | Certificate + End-Entity profiles as separate concepts; approval workflows; signed audit logs |
| **step-ca**   | Lightweight two-tier PKI; short-lived cert model; provisioner abstraction                     |
| **cfssl**     | JSON-based signing profiles; modular toolkit approach                                         |
| **BounCA**    | Django/Vue web UI for CA hierarchy; good UX reference for simple internal PKI                 |
| **Vault PKI** | Dynamic cert generation; role-based issuance; TTL-driven lifecycle                            |

---

## 4. System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX Reverse Proxy                      │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │  Standard TLS (443)     │  │  mTLS Client Auth (8443)     │  │
│  │  Web UI + Admin API     │  │  Cert Login + mTLS endpoints │  │
│  └────────────┬────────────┘  └──────────────┬───────────────┘  │
│               │                              │                   │
│               │  HTTP headers:               │  HTTP headers:    │
│               │  (standard)                  │  x-ssl-user-dn    │
│               │                              │  x-ssl-cn         │
│               │                              │  x-ssl-serial     │
│               │                              │  x-ssl-authenticated│
│               │                              │  x-ssl-expiration  │
└───────────────┼──────────────────────────────┼───────────────────┘
                │                              │
                v                              v
┌──────────────────────────────────────────────────────────────────┐
│                     Express API Server                           │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ CA Manager   │  │ Cert Issuer  │  │ Auth (Cert Login)      │  │
│  │ Service      │  │ Service      │  │ Service                │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬───────────┘  │
│         │                │                        │              │
│  ┌──────┴────────────────┴────────────────────────┴───────────┐  │
│  │                    Crypto Service                           │  │
│  │  (node-forge / OpenSSL wrapper for key gen, signing, etc.) │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────┴──────────────────────────────────┐  │
│  │                  PostgreSQL (Drizzle ORM)                    │  │
│  │  CAs │ Certs │ Keys │ Profiles │ CSRs │ CRLs │ Audit Logs  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                │
                v
┌──────────────────────────────────────────────────────────────────┐
│                     React Web UI                                 │
│                                                                  │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Dashboard │ │ CA Hierarchy │ │ Certs    │ │ Audit Logs    │   │
│  └──────────┘ └──────────────┘ └──────────┘ └───────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Backend Layer Mapping

Following the fullstack-template's 4-layer pattern:

| Layer               | PKI Responsibility                                                                        |
|---------------------|-------------------------------------------------------------------------------------------|
| **Router**          | `/api/v2/ca/*`, `/api/v2/certificates/*`, `/api/v2/crl/*`, `/api/v2/auth/cert-login`      |
| **Controller**      | Parse requests, validate permissions, call services, format responses                     |
| **Service**         | All PKI business logic: CA creation, cert signing, revocation, CRL generation, cert login |
| **Model (Drizzle)** | Schema definitions for CAs, certificates, keys, profiles, CSRs, CRLs, audit logs          |

### Crypto Layer

The Crypto Service wraps cryptographic operations and is the **only
** module that touches private keys:

```
CryptoService
├── generateKeyPair(algorithm, size) → { publicKey, privateKey, fingerprint }
├── generateCSR(keyPair, subject, extensions) → csrPem
├── signCertificate(caCert, caKey, csr, profile, serial) → certPem
├── signCRL(caCert, caKey, revokedCerts) → crlPem
├── verifyChain(cert, chain) → boolean
├── parseCertificate(pem) → CertificateInfo
├── exportPKCS12(cert, key, chain, password) → p12Buffer
└── encryptPrivateKey(key, passphrase) → encryptedPem
```

**Library choice**:
`node-forge` for pure-JS operations (key gen, CSR, signing, PKCS#12). Fall back to OpenSSL child process for edge cases (CRL generation, complex extensions). This avoids the fragility of parsing OpenSSL CLI output while keeping compatibility.

---

## 5. PKI Hierarchy

### Two-Tier Model (Default)

```
Root CA (offline-capable, long-lived)
│
├── Intermediate CA: "TLS Issuing CA"
│   └── Server certificates (TLS/HTTPS)
│
├── Intermediate CA: "Client Auth Issuing CA"
│   └── Client certificates (mTLS, VPN, user auth)
│
└── Intermediate CA: "Internal Services CA" (optional)
    └── Service-to-service mTLS certificates
```

### CA Record Structure

Each CA in the system has:

- **Identity**: Name, description, subject DN
- **Key pair**: Algorithm (RSA/ECDSA), size, encrypted private key stored in DB
- **Certificate**: Self-signed (root) or signed by parent CA (intermediate)
- **Parent reference**: NULL for root CAs, foreign key for intermediates
- **Constraints**: `pathLenConstraint`, name constraints, allowed key usages
- **Status**: `active`, `suspended`, `retired` (no new certs), `revoked`
- **Operational config
  **: Default validity period, CRL distribution URL, OCSP URL, serial counter

### Hierarchy Rules (Enforced by Service Layer)

1. Root CAs have no parent; intermediates MUST have a parent
2. `pathLenConstraint` enforced — an intermediate with
   `pathLen:0` cannot sign other CA certs
3. An intermediate's validity cannot exceed its parent's validity
4. Revoking or retiring a CA marks all its active certificates as "issuer-revoked" (they remain valid until CRL is consumed by relying parties)
5. A CA's key algorithm and size must meet the configured minimum (e.g., RSA 4096 for CAs, RSA 2048 for end-entity)

---

## 6. Data Model

### Entity Relationship Overview

```
certificate_authorities ─┐
  │ (self-referential      │
  │  parent_ca_id)         │
  │                        │
  ├── certificates ────────┤
  │     │                  │
  │     ├── cert_extensions│
  │     │                  │
  │     └── revocations    │
  │                        │
  ├── certificate_requests │
  │                        │
  ├── crls                 │
  │                        │
  └── certificate_profiles │
                           │
private_keys ──────────────┘
  (referenced by CAs and certs)

users ── user_certificates (binding table for cert login)

audit_logs (immutable, references all operations)
```

### Schema Definitions (Drizzle)

#### `certificate_authorities`

```typescript
export const certificateAuthorities = pgTable('certificate_authorities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),

  // Subject DN components
  commonName: varchar('common_name', { length: 255 }).notNull(),
  organization: varchar('organization', { length: 255 }),
  organizationalUnit: varchar('organizational_unit', { length: 255 }),
  country: varchar('country', { length: 2 }),
  state: varchar('state', { length: 255 }),
  locality: varchar('locality', { length: 255 }),

  // Hierarchy
  parentCaId: uuid('parent_ca_id').references(() => certificateAuthorities.id),
  isRoot: boolean('is_root').notNull().default(false),
  pathLenConstraint: integer('path_len_constraint'),  // NULL = unlimited

  // Certificate & Key references
  certificateId: uuid('certificate_id'),  // FK to certificates (the CA's own cert)
  privateKeyId: uuid('private_key_id').references(() => privateKeys.id).notNull(),

  // Operational
  status: varchar('status', { length: 20 }).notNull().default('active'),
  // 'active' | 'suspended' | 'retired' | 'revoked'
  serialCounter: bigint('serial_counter', { mode: 'bigint' }).notNull().default(1n),
  defaultValidityDays: integer('default_validity_days').notNull().default(365),
  maxValidityDays: integer('max_validity_days').notNull().default(3650),

  // Distribution points
  crlDistributionUrl: varchar('crl_distribution_url', { length: 512 }),
  ocspResponderUrl: varchar('ocsp_responder_url', { length: 512 }),
  caIssuersUrl: varchar('ca_issuers_url', { length: 512 }),

  // Metadata
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### `private_keys`

```typescript
export const privateKeys = pgTable('private_keys', {
  id: uuid('id').primaryKey().defaultRandom(),

  algorithm: varchar('algorithm', { length: 10 }).notNull(),  // 'RSA' | 'ECDSA' | 'Ed25519'
  keySize: integer('key_size'),        // 2048, 4096 for RSA; NULL for Ed25519
  curve: varchar('curve', { length: 20 }),  // 'P-256', 'P-384' for ECDSA

  // Storage
  // Private key is ALWAYS encrypted at rest with AES-256-GCM
  // The encryption key is derived from the CA passphrase (PBKDF2/Argon2)
  encryptedPrivateKeyPem: text('encrypted_private_key_pem').notNull(),
  publicKeyPem: text('public_key_pem').notNull(),
  keyFingerprint: varchar('key_fingerprint', { length: 128 }).notNull().unique(),

  // Key encryption metadata
  encryptionAlgorithm: varchar('encryption_algorithm', { length: 50 }).notNull()
    .default('aes-256-gcm'),
  kdfAlgorithm: varchar('kdf_algorithm', { length: 50 }).notNull()
    .default('argon2id'),
  kdfSalt: varchar('kdf_salt', { length: 128 }).notNull(),
  encryptionIv: varchar('encryption_iv', { length: 64 }).notNull(),
  encryptionTag: varchar('encryption_tag', { length: 64 }),  // For GCM

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### `certificates`

```typescript
export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Issuer
  issuingCaId: uuid('issuing_ca_id').references(() => certificateAuthorities.id).notNull(),
  serialNumber: varchar('serial_number', { length: 64 }).notNull(),
  // Hex string, unique per CA

  // Subject
  commonName: varchar('common_name', { length: 255 }).notNull(),
  organization: varchar('organization', { length: 255 }),
  organizationalUnit: varchar('organizational_unit', { length: 255 }),
  country: varchar('country', { length: 2 }),
  state: varchar('state', { length: 255 }),
  locality: varchar('locality', { length: 255 }),
  emailAddress: varchar('email_address', { length: 255 }),

  // Subject Alternative Names (stored as JSON array)
  subjectAltNames: jsonb('subject_alt_names').$type<{
    dnsNames?: string[];
    ipAddresses?: string[];
    emailAddresses?: string[];
    uris?: string[];
  }>(),

  // Certificate data
  certificatePem: text('certificate_pem').notNull(),
  publicKeyFingerprint: varchar('public_key_fingerprint', { length: 128 }).notNull(),

  // Validity
  notBefore: timestamp('not_before').notNull(),
  notAfter: timestamp('not_after').notNull(),

  // Type & Status
  type: varchar('type', { length: 20 }).notNull(),
  // 'root_ca' | 'intermediate_ca' | 'server' | 'client' | 'user'
  status: varchar('status', { length: 20 }).notNull().default('active'),
  // 'active' | 'revoked' | 'expired' | 'superseded' | 'hold'

  // Profile used
  profileId: uuid('profile_id').references(() => certificateProfiles.id),

  // Private key reference (only for certs where we generated the key)
  privateKeyId: uuid('private_key_id').references(() => privateKeys.id),

  // If this cert was issued from a CSR
  requestId: uuid('request_id').references(() => certificateRequests.id),

  // Metadata
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),

}, (table) => [
  uniqueIndex('cert_serial_ca_idx').on(table.issuingCaId, table.serialNumber),
  index('cert_status_idx').on(table.status),
  index('cert_not_after_idx').on(table.notAfter),
  index('cert_cn_idx').on(table.commonName),
  index('cert_fingerprint_idx').on(table.publicKeyFingerprint),
]);
```

#### `certificate_requests`

```typescript
export const certificateRequests = pgTable('certificate_requests', {
  id: uuid('id').primaryKey().defaultRandom(),

  // CSR data
  csrPem: text('csr_pem').notNull(),
  commonName: varchar('common_name', { length: 255 }).notNull(),
  subjectDn: varchar('subject_dn', { length: 1024 }).notNull(),
  subjectAltNames: jsonb('subject_alt_names'),

  // Processing
  targetCaId: uuid('target_ca_id').references(() => certificateAuthorities.id).notNull(),
  profileId: uuid('profile_id').references(() => certificateProfiles.id),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  // 'pending' | 'approved' | 'rejected' | 'issued'
  rejectionReason: text('rejection_reason'),

  // Resulting certificate (set after issuance)
  certificateId: uuid('certificate_id').references(() => certificates.id),

  // Who requested and who approved
  requestedBy: uuid('requested_by').references(() => users.id),
  approvedBy: uuid('approved_by').references(() => users.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### `certificate_profiles`

```typescript
export const certificateProfiles = pgTable('certificate_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),

  // What this profile is for
  certType: varchar('cert_type', { length: 20 }).notNull(),
  // 'server' | 'client' | 'user' | 'intermediate_ca'

  // Key constraints
  allowedKeyAlgorithms: jsonb('allowed_key_algorithms')
    .$type<string[]>()  // ['RSA', 'ECDSA']
    .notNull(),
  minKeySize: integer('min_key_size').notNull().default(2048),

  // Validity
  defaultValidityDays: integer('default_validity_days').notNull(),
  maxValidityDays: integer('max_validity_days').notNull(),

  // Extensions (X.509v3)
  keyUsage: jsonb('key_usage').$type<string[]>().notNull(),
  // e.g. ['digitalSignature', 'keyEncipherment']
  extendedKeyUsage: jsonb('extended_key_usage').$type<string[]>().notNull(),
  // e.g. ['serverAuth', 'clientAuth']
  basicConstraints: jsonb('basic_constraints').$type<{
    ca: boolean;
    pathLenConstraint?: number;
  }>().notNull(),

  // Subject constraints
  requiredSubjectFields: jsonb('required_subject_fields').$type<string[]>(),
  // e.g. ['commonName', 'organization']
  allowedSanTypes: jsonb('allowed_san_types').$type<string[]>(),
  // e.g. ['dnsNames', 'ipAddresses']

  // Which CAs can use this profile
  allowedCaIds: jsonb('allowed_ca_ids').$type<string[]>(),  // NULL = any CA

  isDefault: boolean('is_default').notNull().default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### `revocations`

```typescript
export const revocations = pgTable('revocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  certificateId: uuid('certificate_id').references(() => certificates.id).notNull().unique(),

  reason: varchar('reason', { length: 30 }).notNull(),
  // RFC 5280 reason codes:
  // 'unspecified' | 'keyCompromise' | 'caCompromise' | 'affiliationChanged'
  // | 'superseded' | 'cessationOfOperation' | 'certificateHold'
  // | 'removeFromCRL' | 'privilegeWithdrawn'

  revokedAt: timestamp('revoked_at').defaultNow().notNull(),
  invalidityDate: timestamp('invalidity_date'),  // When key was actually compromised

  revokedBy: uuid('revoked_by').references(() => users.id).notNull(),
  notes: text('notes'),
});
```

#### `crls` (Certificate Revocation Lists)

```typescript
export const crls = pgTable('crls', {
  id: uuid('id').primaryKey().defaultRandom(),
  caId: uuid('ca_id').references(() => certificateAuthorities.id).notNull(),

  crlNumber: bigint('crl_number', { mode: 'bigint' }).notNull(),
  crlPem: text('crl_pem').notNull(),
  crlDer: bytea('crl_der'),  // Binary DER for direct download

  thisUpdate: timestamp('this_update').notNull(),
  nextUpdate: timestamp('next_update').notNull(),

  entriesCount: integer('entries_count').notNull().default(0),

  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  generatedBy: uuid('generated_by').references(() => users.id).notNull(),
});
```

#### `user_certificates` (Binding for Cert Login)

```typescript
export const userCertificates = pgTable('user_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // Certificate identification fields (used for login matching)
  certificateDn: varchar('certificate_dn', { length: 1024 }).notNull(),
  certificateCn: varchar('certificate_cn', { length: 255 }).notNull(),
  certificateSerial: varchar('certificate_serial', { length: 128 }),
  certificateFingerprint: varchar('certificate_fingerprint', { length: 128 }),

  // Expiration tracking
  expiresAt: timestamp('expires_at'),

  // Reference to managed certificate (if issued by our CA)
  certificateId: uuid('certificate_id').references(() => certificates.id),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'),
  // 'active' | 'suspended' | 'removed'

  // Label for user display (e.g., "Work Laptop", "YubiKey")
  label: varchar('label', { length: 255 }),

  attachedAt: timestamp('attached_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),

}, (table) => [
  index('user_cert_cn_idx').on(table.certificateCn),
  index('user_cert_dn_idx').on(table.certificateDn),
  index('user_cert_serial_idx').on(table.certificateSerial),
  index('user_cert_user_idx').on(table.userId),
]);
```

#### `cert_attach_codes` (One-Time Codes for Cert Binding)

```typescript
export const certAttachCodes = pgTable('cert_attach_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  code: uuid('code').notNull().unique().defaultRandom(),
  expiresAt: timestamp('expires_at').notNull(),

  used: boolean('used').notNull().default(false),
  usedAt: timestamp('used_at'),

  // Optionally replace existing cert binding
  replacesBindingId: uuid('replaces_binding_id').references(() => userCertificates.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### `pki_audit_logs`

```typescript
export const pkiAuditLogs = pgTable('pki_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // What happened
  action: varchar('action', { length: 50 }).notNull(),
  // 'ca.create' | 'ca.update' | 'ca.suspend' | 'ca.retire'
  // | 'cert.issue' | 'cert.revoke' | 'cert.renew'
  // | 'csr.submit' | 'csr.approve' | 'csr.reject'
  // | 'crl.generate' | 'profile.create' | 'profile.update'
  // | 'cert_login.success' | 'cert_login.failure'
  // | 'cert_attach.code_generated' | 'cert_attach.completed'
  // | 'key.generate'

  // Who did it
  actorId: uuid('actor_id').references(() => users.id),
  actorIp: varchar('actor_ip', { length: 45 }),

  // What was affected
  targetType: varchar('target_type', { length: 30 }).notNull(),
  // 'ca' | 'certificate' | 'csr' | 'crl' | 'profile' | 'user_certificate' | 'key'
  targetId: uuid('target_id'),

  // Details (structured JSON)
  details: jsonb('details').$type<Record<string, unknown>>(),

  // Result
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),

  createdAt: timestamp('created_at').defaultNow().notNull(),

}, (table) => [
  index('audit_action_idx').on(table.action),
  index('audit_actor_idx').on(table.actorId),
  index('audit_target_idx').on(table.targetType, table.targetId),
  index('audit_created_idx').on(table.createdAt),
]);
```

---

## 7. Certificate Profiles

### Built-In Profiles

#### TLS Server Certificate

```json
{
  "name": "TLS Server",
  "certType": "server",
  "allowedKeyAlgorithms": ["RSA", "ECDSA"],
  "minKeySize": 2048,
  "defaultValidityDays": 365,
  "maxValidityDays": 398,
  "keyUsage": ["digitalSignature", "keyEncipherment"],
  "extendedKeyUsage": ["serverAuth"],
  "basicConstraints": {"ca": false},
  "requiredSubjectFields": ["commonName"],
  "allowedSanTypes": ["dnsNames", "ipAddresses"]
}
```

#### Client Authentication Certificate

```json
{
  "name": "Client Auth",
  "certType": "client",
  "allowedKeyAlgorithms": ["RSA", "ECDSA"],
  "minKeySize": 2048,
  "defaultValidityDays": 730,
  "maxValidityDays": 3650,
  "keyUsage": ["digitalSignature"],
  "extendedKeyUsage": ["clientAuth"],
  "basicConstraints": {"ca": false},
  "requiredSubjectFields": ["commonName"],
  "allowedSanTypes": ["emailAddresses"]
}
```

#### User Authentication Certificate (for Cert Login)

```json
{
  "name": "User Auth",
  "certType": "user",
  "allowedKeyAlgorithms": ["RSA", "ECDSA"],
  "minKeySize": 2048,
  "defaultValidityDays": 365,
  "maxValidityDays": 730,
  "keyUsage": ["digitalSignature", "nonRepudiation"],
  "extendedKeyUsage": ["clientAuth", "emailProtection"],
  "basicConstraints": {"ca": false},
  "requiredSubjectFields": ["commonName", "emailAddress"],
  "allowedSanTypes": ["emailAddresses"]
}
```

#### Intermediate CA Certificate

```json
{
  "name": "Intermediate CA",
  "certType": "intermediate_ca",
  "allowedKeyAlgorithms": ["RSA", "ECDSA"],
  "minKeySize": 4096,
  "defaultValidityDays": 3650,
  "maxValidityDays": 7300,
  "keyUsage": ["keyCertSign", "cRLSign"],
  "extendedKeyUsage": [],
  "basicConstraints": {"ca": true, "pathLenConstraint": 0},
  "requiredSubjectFields": ["commonName", "organization"],
  "allowedSanTypes": []
}
```

### S/MIME Email Certificate

```json
{
  "name": "S/MIME Email",
  "certType": "user",
  "allowedKeyAlgorithms": ["RSA", "ECDSA"],
  "minKeySize": 2048,
  "defaultValidityDays": 365,
  "maxValidityDays": 1095,
  "keyUsage": ["digitalSignature", "keyEncipherment"],
  "extendedKeyUsage": ["emailProtection"],
  "basicConstraints": {"ca": false},
  "requiredSubjectFields": ["commonName", "emailAddress"],
  "allowedSanTypes": ["emailAddresses"]
}
```

Profiles are fully customizable — admins can create additional profiles for VPN clients, code signing, IoT devices, or any other use case through the web UI or API.

---

## 8. Certificate Lifecycle

### Issuance Flows

#### Flow A: Direct Issuance (Server Generates Key)

Best for: Admin issuing certs for users/services under their control.

```
Admin → API: POST /api/v2/certificates/issue
  { caId, profileId, subject: { cn, org, ... }, sans: { dnsNames: [...] },
    validityDays, keyAlgorithm, keySize }

API:
  1. Validate profile constraints (key algo, size, validity, required fields)
  2. Generate key pair (CryptoService)
  3. Create CSR internally
  4. Increment CA serial counter
  5. Sign certificate with CA key (requires CA passphrase from request or session cache)
  6. Store: private_keys, certificates records
  7. Audit log: 'key.generate', 'cert.issue'
  8. Return: { certificate, privateKey, chain }
```

#### Flow B: CSR-Based Issuance

Best for: When the requester generates their own key pair.

```
Requester → API: POST /api/v2/certificates/requests
  { caId, profileId, csrPem }

API:
  1. Parse and validate CSR
  2. Check CSR subject/extensions against profile constraints
  3. Store certificate_requests record (status: 'pending')
  4. Audit log: 'csr.submit'

Approver → API: POST /api/v2/certificates/requests/:id/approve
  { validityDays (optional override) }

API:
  1. Validate approver has permission
  2. Sign certificate from CSR
  3. Store certificates record
  4. Update request status to 'issued'
  5. Audit log: 'csr.approve', 'cert.issue'
  6. Return: { certificate, chain }
```

### Renewal

```
Admin → API: POST /api/v2/certificates/:id/renew
  { validityDays (optional), newCsrPem (optional) }

API:
  1. Load existing certificate
  2. Verify cert is still active and approaching expiration (< 30 days by default)
  3. Reuse existing key or accept new CSR
  4. Issue new certificate with same subject/extensions
  5. Mark old certificate status as 'superseded'
  6. Audit log: 'cert.renew'
  7. Return: { newCertificate, chain }
```

### Revocation

```
Admin → API: POST /api/v2/certificates/:id/revoke
  { reason: 'keyCompromise' | ... , notes? }

API:
  1. Validate certificate is active
  2. Create revocations record
  3. Update certificate status to 'revoked'
  4. Audit log: 'cert.revoke'
  5. If auto-CRL enabled: trigger CRL regeneration
  6. Return: { success: true }
```

### CRL Generation

```
Admin → API: POST /api/v2/ca/:caId/crl/generate
  (requires CA passphrase)

API:
  1. Gather all revoked certs for this CA
  2. Build CRL structure with:
     - thisUpdate: now
     - nextUpdate: now + crlValidityDays (default 7)
     - Revoked cert serials + reason codes + revocation dates
  3. Sign CRL with CA key
  4. Store in crls table (PEM + DER)
  5. Audit log: 'crl.generate'
  6. Return: { crlNumber, entriesCount, nextUpdate }

Public → GET /api/v2/ca/:caId/crl
  → Returns latest CRL in DER format (no auth required)
```

### Expiration Monitoring

A scheduled job (cron or BullMQ) runs daily:

```
ExpirationMonitor:
  1. Query certificates WHERE status = 'active' AND notAfter < now + warningWindow
  2. For each expiring cert:
     - 30 days: create notification (warning)
     - 7 days: create notification (critical)
     - 0 days (expired): update status to 'expired', create notification
  3. Query CAs WHERE latest CRL nextUpdate < now + 3 days
     - Alert admin that CRL needs regeneration
```

---

## 9. Certificate-Based Login

This section designs a certificate-based authentication system for the fullstack-template's Express/PostgreSQL/JWT stack, using a proven mTLS-via-reverse-proxy pattern.

### Architecture

```
┌──────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Browser  │────▶│  NGINX (mTLS on     │────▶│  Express API     │
│           │     │  port 8443)          │     │                  │
│  Client   │     │                      │     │  Extracts cert   │
│  cert in  │     │  Validates cert      │     │  from headers    │
│  keychain │     │  against trusted CAs │     │  Matches to user │
│           │     │  Forwards headers:   │     │  Issues JWT      │
│           │     │  x-ssl-user-dn       │     │                  │
│           │     │  x-ssl-cn            │     │                  │
│           │     │  x-ssl-serial        │     │                  │
│           │     │  x-ssl-authenticated │     │                  │
│           │     │  x-ssl-expiration    │     │                  │
└──────────┘     └──────────────────────┘     └──────────────────┘
```

### NGINX Configuration

```nginx
# Standard HTTPS (web UI, API)
server {
    listen 443 ssl;
    server_name app.example.com;

    ssl_certificate     /etc/nginx/tls/server.crt;
    ssl_certificate_key /etc/nginx/tls/server.key;

    location / {
        proxy_pass http://localhost:3000;
    }
}

# mTLS endpoint (cert login)
server {
    listen 8443 ssl;
    server_name app.example.com;

    ssl_certificate     /etc/nginx/tls/server.crt;
    ssl_certificate_key /etc/nginx/tls/server.key;

    # Client certificate verification
    ssl_client_certificate /etc/nginx/tls/trusted-ca-chain.pem;
    ssl_verify_client optional;  # Don't reject; let Express handle logic
    ssl_verify_depth 3;

    location /api/v2/auth/cert-login {
        proxy_pass http://localhost:3000;

        # Forward certificate details as headers
        proxy_set_header X-SSL-User-DN     $ssl_client_s_dn;
        proxy_set_header X-SSL-CN          $ssl_client_s_dn_cn;  # Requires map
        proxy_set_header X-SSL-Serial      $ssl_client_serial;
        proxy_set_header X-SSL-Authenticated $ssl_client_verify;
        proxy_set_header X-SSL-Expiration  $ssl_client_v_end;
        proxy_set_header X-SSL-Fingerprint $ssl_client_fingerprint;
        proxy_set_header X-Forwarded-For   $remote_addr;
    }

    location /api/v2/auth/cert-attach {
        proxy_pass http://localhost:3000;
        proxy_set_header X-SSL-User-DN     $ssl_client_s_dn;
        proxy_set_header X-SSL-CN          $ssl_client_s_dn_cn;
        proxy_set_header X-SSL-Serial      $ssl_client_serial;
        proxy_set_header X-SSL-Authenticated $ssl_client_verify;
        proxy_set_header X-SSL-Expiration  $ssl_client_v_end;
        proxy_set_header X-SSL-Fingerprint $ssl_client_fingerprint;
        proxy_set_header X-Forwarded-For   $remote_addr;
    }
}
```

### Certificate Header Extraction

```typescript
// src/libs/extractClientCert.ts

type ExtractedClientCert = {
  dn: string | undefined;
  cn: string | undefined;
  serial: string | undefined;
  fingerprint: string | undefined;
  authenticated: string | undefined;  // 'SUCCESS' or failure reason
  expiration: Date | undefined;
};

function parseCN(dn: string | undefined): string | undefined {
  if (!dn) return undefined;
  // DN format: "CN=John Doe,O=Org,C=US" or "/CN=John Doe/O=Org/C=US"
  const cnMatch = dn.match(/CN=([^,/]+)/i);
  return cnMatch?.[1]?.trim();
}

export function extractClientCert(req: Request): ExtractedClientCert {
  const dn = req.headers['x-ssl-user-dn'] as string | undefined;
  const cn = parseCN(dn) ?? (req.headers['x-ssl-cn'] as string | undefined);
  const serial = req.headers['x-ssl-serial'] as string | undefined;
  const fingerprint = req.headers['x-ssl-fingerprint'] as string | undefined;
  const authenticated = req.headers['x-ssl-authenticated'] as string | undefined;
  const rawExpiration = req.headers['x-ssl-expiration'] as string | undefined;
  const expiration = rawExpiration ? new Date(rawExpiration) : undefined;

  return { dn, cn, serial, fingerprint, authenticated, expiration };
}
```

### Certificate Login Flow

```
┌─────────┐                           ┌─────────┐                    ┌────────┐
│  Client  │                           │  NGINX  │                    │  API   │
└────┬────┘                           └────┬────┘                    └───┬────┘
     │                                     │                             │
     │  1. GET /cert-login                 │                             │
     │  (browser prompts for client cert)  │                             │
     │ ──────────────────────────────────▶ │                             │
     │                                     │                             │
     │                                     │  2. Validate cert against   │
     │                                     │     trusted CA chain        │
     │                                     │                             │
     │                                     │  3. Extract cert fields     │
     │                                     │     into HTTP headers       │
     │                                     │ ──────────────────────────▶ │
     │                                     │                             │
     │                                     │                             │  4. Extract cert
     │                                     │                             │     from headers
     │                                     │                             │
     │                                     │                             │  5. Validate:
     │                                     │                             │     - authenticated=SUCCESS
     │                                     │                             │     - cert not expired
     │                                     │                             │
     │                                     │                             │  6. Look up user by
     │                                     │                             │     CN, DN, or serial
     │                                     │                             │     in user_certificates
     │                                     │                             │
     │                                     │                             │  7. Check auth policy
     │                                     │                             │
     │          ┌──────────────────────────────────────────────────────┐  │
     │          │ IF secondFactorRequired:                             │  │
     │          │   Return { requireSecondFactor: true, methods: [...]}│  │
     │          │   Client submits password → /login-second-factor     │  │
     │          │   Verify password → issue full JWT                   │  │
     │          │                                                      │  │
     │          │ ELSE:                                                │  │
     │          │   Issue JWT directly                                 │  │
     │          └──────────────────────────────────────────────────────┘  │
     │                                     │                             │
     │  8. Response: { token, user }       │                             │
     │ ◀──────────────────────────────────────────────────────────────── │
     │                                     │                             │
```

### CertLoginService

```typescript
// src/services/cert-login.service.ts (conceptual)

static async loginWithCertificate(req: Request): Promise<Result<CertLoginResult>> {
  return tryCatch(async () => {
    const cert = extractClientCert(req);

    // Step 1: Validate certificate was presented and authenticated
    if (!cert.dn || !cert.cn) {
      throw new ServiceError('Certificate not detected', 'CERT_NOT_DETECTED', 401);
    }
    if (cert.authenticated !== 'SUCCESS') {
      throw new ServiceError('Certificate not authenticated by proxy', 'CERT_NOT_AUTHENTICATED', 401);
    }
    if (cert.expiration && cert.expiration < new Date()) {
      throw new ServiceError('Certificate has expired', 'CERT_EXPIRED', 401);
    }

    // Step 2: Find user by certificate fields
    const binding = await db.select()
      .from(userCertificates)
      .where(
        and(
          eq(userCertificates.status, 'active'),
          or(
            cert.cn ? eq(userCertificates.certificateCn, cert.cn) : undefined,
            cert.dn ? eq(userCertificates.certificateDn, cert.dn) : undefined,
            cert.serial ? eq(userCertificates.certificateSerial, cert.serial) : undefined,
          ),
        ),
      )
      .limit(1);

    if (!binding.length) {
      throw new ServiceError('No account linked to this certificate', 'CERT_NOT_BOUND', 401);
    }

    const userCert = binding[0];
    const user = await UserService.getById(userCert.userId);

    // Step 3: Update last-used and expiration tracking
    await db.update(userCertificates)
      .set({
        lastUsedAt: new Date(),
        expiresAt: cert.expiration ?? userCert.expiresAt,
      })
      .where(eq(userCertificates.id, userCert.id));

    // Step 4: Check auth policy
    const policy = await AuthPolicyService.resolve(user);

    if (policy.requireSecondFactorWithCert) {
      return {
        status: 'second_factor_required',
        firstFactor: 'x509',
        userId: user.id,
        allowedSecondFactors: ['password'],  // Only password after cert
      };
    }

    // Step 5: Issue JWT
    const token = await JwtService.sign({
      sub: user.id,
      email: user.email,
      authMethod: 'x509',
    });

    return { status: 'authenticated', token, user };
  });
}
```

### Certificate Attachment Flow

Users bind their certificate to their account using a one-time code:

```
1. User is logged in (any method)
2. User navigates to "Security" → "Certificate Management"
3. Frontend: POST /api/v2/auth/cert-attach/code
   → Backend generates UUID code (15-min TTL, 5/hour rate limit)
   → Returns { code, expiresAt }
4. Frontend displays code and instructs user to open the mTLS endpoint
5. User opens https://app.example.com:8443/api/v2/auth/cert-attach
   → Browser prompts for client certificate selection
   → NGINX validates cert, forwards headers
   → User's browser sends: POST with { code } in body
6. Backend:
   a. Validate code (exists, not used, not expired)
   b. Extract cert from headers (validate authenticated=SUCCESS, not expired)
   c. Check cert not already bound to another account
   d. Create user_certificates record (dn, cn, serial, fingerprint, expiration)
   e. Mark code as used
   f. Audit log: 'cert_attach.completed'
7. Return { success: true, binding: { cn, dn, expiresAt } }
```

### Auth Policy

```typescript
type AuthPolicy = {
  certLoginEnabled: boolean;           // Can users cert-login at all?
  requireCertLogin: boolean;           // Must users use cert (no password)?
  requireSecondFactorWithCert: boolean; // Password required after cert?
  allowedSecondFactors: ('password' | 'totp')[];
};

// Policy resolution: User → Role → Organization → System Default
// Most specific non-null value wins
```

---

## 10. API Design

### CA Management

| Method  | Path                     | Description                                     |
|---------|--------------------------|-------------------------------------------------|
| `POST`  | `/api/v2/ca`             | Create a new CA (root or intermediate)          |
| `GET`   | `/api/v2/ca`             | List all CAs (with hierarchy info)              |
| `GET`   | `/api/v2/ca/:id`         | Get CA details                                  |
| `PATCH` | `/api/v2/ca/:id`         | Update CA settings (status, validity defaults)  |
| `POST`  | `/api/v2/ca/:id/suspend` | Suspend CA (stop issuing)                       |
| `POST`  | `/api/v2/ca/:id/retire`  | Retire CA (no new certs, keep for verification) |
| `GET`   | `/api/v2/ca/:id/chain`   | Download CA certificate chain (PEM)             |

### Certificate Operations

| Method | Path                                | Description                                                   |
|--------|-------------------------------------|---------------------------------------------------------------|
| `POST` | `/api/v2/certificates/issue`        | Issue certificate directly                                    |
| `GET`  | `/api/v2/certificates`              | List/search certificates (filter by CA, status, type, expiry) |
| `GET`  | `/api/v2/certificates/:id`          | Get certificate details                                       |
| `GET`  | `/api/v2/certificates/:id/download` | Download cert (PEM, DER, or PKCS#12)                          |
| `POST` | `/api/v2/certificates/:id/renew`    | Renew certificate                                             |
| `POST` | `/api/v2/certificates/:id/revoke`   | Revoke certificate                                            |

### CSR Workflow

| Method | Path                                        | Description          |
|--------|---------------------------------------------|----------------------|
| `POST` | `/api/v2/certificates/requests`             | Submit CSR           |
| `GET`  | `/api/v2/certificates/requests`             | List pending CSRs    |
| `GET`  | `/api/v2/certificates/requests/:id`         | Get CSR details      |
| `POST` | `/api/v2/certificates/requests/:id/approve` | Approve and sign CSR |
| `POST` | `/api/v2/certificates/requests/:id/reject`  | Reject CSR           |

### CRL

| Method | Path                          | Description                           |
|--------|-------------------------------|---------------------------------------|
| `POST` | `/api/v2/ca/:id/crl/generate` | Generate new CRL                      |
| `GET`  | `/api/v2/ca/:id/crl`          | Download latest CRL (public, no auth) |
| `GET`  | `/api/v2/ca/:id/crl/history`  | List CRL generation history           |

### Profiles

| Method   | Path                               | Description                     |
|----------|------------------------------------|---------------------------------|
| `POST`   | `/api/v2/certificate-profiles`     | Create profile                  |
| `GET`    | `/api/v2/certificate-profiles`     | List profiles                   |
| `GET`    | `/api/v2/certificate-profiles/:id` | Get profile details             |
| `PATCH`  | `/api/v2/certificate-profiles/:id` | Update profile                  |
| `DELETE` | `/api/v2/certificate-profiles/:id` | Delete profile (only if unused) |

### Certificate Login & Attachment

| Method   | Path                                    | Description                                        |
|----------|-----------------------------------------|----------------------------------------------------|
| `POST`   | `/api/v2/auth/cert-login`               | Login with client certificate (via mTLS proxy)     |
| `POST`   | `/api/v2/auth/cert-login/second-factor` | Submit second factor after cert login              |
| `POST`   | `/api/v2/auth/cert-attach/code`         | Generate one-time cert attach code                 |
| `POST`   | `/api/v2/auth/cert-attach`              | Attach cert to account using code (via mTLS proxy) |
| `GET`    | `/api/v2/auth/cert-status`              | Get current user's cert binding status             |
| `DELETE` | `/api/v2/auth/cert-binding/:id`         | Remove cert binding (requires reauth)              |

### Audit

| Method | Path                     | Description                                                     |
|--------|--------------------------|-----------------------------------------------------------------|
| `GET`  | `/api/v2/pki/audit-logs` | Search audit logs (filter by action, actor, target, date range) |

---

## 11. Web UI

### Page Structure

```
/pki
├── /dashboard           — Overview: cert counts by status, expiring soon, recent activity
├── /ca
│   ├── (list)           — CA hierarchy tree view + table
│   ├── /create          — Create Root or Intermediate CA wizard
│   └── /:id             — CA detail: info, issued certs, CRL history, actions
├── /certificates
│   ├── (list)           — Filterable table (status, type, CA, expiry range, search)
│   ├── /issue           — Issue new cert (select CA, profile, fill subject, generate)
│   └── /:id             — Cert detail: subject, extensions, chain, download, revoke
├── /requests
│   ├── (list)           — Pending CSRs for approval
│   └── /:id             — CSR detail: review subject/extensions, approve/reject
├── /profiles
│   ├── (list)           — Certificate profile management
│   ├── /create          — Create new profile
│   └── /:id             — Edit profile
└── /audit               — Audit log viewer with filters

/settings/security
├── Certificate Login    — Attach/remove certificate, view binding status
└── Auth Policy          — Configure cert login requirements (admin)
```

### Dashboard Widgets

1. **Certificate Stats**: Active / Expiring Soon / Expired / Revoked counts
2. **CA Hierarchy**: Visual tree of Root → Intermediate CAs with status badges
3. **Expiring Certificates
   **: Table of certs expiring within 30 days with renew action
4. **Recent Activity**: Last 20 audit log entries
5. **CRL Status**: Last generated date, next update, stale CRL warnings

### CA Hierarchy View

```
┌────────────────────────────────────────────────┐
│  Certificate Authorities                       │
│                                                │
│  [active] Root CA: "Organization Root CA"      │
│  │  RSA 4096 · Expires 2046-01-15             │
│  │  Active · 3 intermediates                   │
│  │                                             │
│  ├── [active] "TLS Issuing CA"                 │
│  │   RSA 4096 · Expires 2036-01-15            │
│  │   Active · 47 certs issued                  │
│  │                                             │
│  ├── [active] "Client Auth CA"                 │
│  │   ECDSA P-384 · Expires 2036-01-15         │
│  │   Active · 89 certs issued                  │
│  │                                             │
│  └── [suspended] "Internal Services CA"        │
│      RSA 4096 · Expires 2036-01-15            │
│      Suspended · 12 certs issued               │
└────────────────────────────────────────────────┘
```

### Certificate Issuance Wizard

```
Step 1: Select CA & Profile
  [ CA dropdown ] [ Profile dropdown ]

Step 2: Subject Information
  Common Name:     [ _________________ ] (required)
  Organization:    [ _________________ ]
  Email:           [ _________________ ]

  Subject Alt Names:
  + Add DNS Name   [ _________________ ]
  + Add IP Address  [ _________________ ]
  + Add Email       [ _________________ ]

Step 3: Key & Validity
  Key Algorithm: ( ) RSA 2048  (•) RSA 4096  ( ) ECDSA P-256
  Validity:      [ 365 ] days  (max: 398 per profile)

Step 4: Review & Generate
  [Subject summary] [Extensions summary] [Generate Certificate]
```

---

## 12. Security Considerations

### Key Protection

| Key Type            | Protection Method                                                                                                                                                                                                   |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Root CA private key | Encrypted in DB with admin passphrase (Argon2id KDF + AES-256-GCM). Passphrase required for each signing operation. Never cached longer than a single request. Design for future HSM migration (PKCS#11 interface). |
| Intermediate CA key | Same encryption scheme. Passphrase required per signing operation. Consider passphrase session cache (5-min TTL, in-memory only) for batch operations.                                                              |
| End-entity keys     | Encrypted with per-cert passphrase or system-managed encryption key.                                                                                                                                                |

### CA Passphrase Handling

**Critical rule
**: CA passphrases are NEVER stored in the database, environment variables, or config files. They are:

1. Provided by the admin in the request body for each signing operation
2. Used to derive the decryption key via Argon2id
3. Used to decrypt the CA private key in memory
4. Discarded after the operation completes

**Optional session cache
**: For batch operations, the decrypted key MAY be held in server memory for up to 5 minutes, protected by:

- In-process memory only (not Redis, not disk)
- Cleared on server restart
- Cleared after TTL expiration
- Only accessible within the same authenticated admin session

### Access Control

| Role             | Permissions                                                                              |
|------------------|------------------------------------------------------------------------------------------|
| **PKI Admin**    | Full CA management, certificate issuance, revocation, CRL generation, profile management |
| **PKI Operator** | Certificate issuance (within assigned CAs), CSR approval/rejection                       |
| **PKI Auditor**  | Read-only access to certificates, CRLs, and audit logs                                   |
| **User**         | View own certificates, generate cert-attach codes, manage own cert bindings              |

### Audit Requirements

All of the following MUST be logged to `pki_audit_logs`:

- CA creation, suspension, retirement
- Key pair generation
- Certificate issuance, renewal, revocation
- CSR submission, approval, rejection
- CRL generation
- Profile creation, modification, deletion
- Certificate login attempts (success and failure)
- Certificate attachment/removal
- Admin permission changes

Audit logs are **append-only
** — no UPDATE or DELETE operations are permitted on the
`pki_audit_logs` table at the application level.

### Network Security

- The API server MUST only accept
  `x-ssl-*` headers from the trusted NGINX proxy. Strip these headers from any request not arriving from the proxy.
- The mTLS port (8443) should only expose cert-login and cert-attach endpoints.
- CRL download endpoints are public (no auth) but rate-limited.
- All other PKI admin endpoints require authentication + appropriate role.

### Passphrase Validation on CA Key Operations

Before any signing operation, verify the passphrase decrypts the key correctly by:

1. Deriving key from passphrase + stored salt via Argon2id
2. Decrypting the stored private key PEM
3. Verifying the decrypted key matches the stored public key fingerprint
4. Only then proceeding with the signing operation

---

## 13. Deployment Architecture

### Docker Compose Addition

```yaml
services:
  nginx:
    image: nginx:latest
    ports:
      - "443:443"    # Standard HTTPS
      - "8443:8443"  # mTLS endpoint
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/tls:/etc/nginx/tls          # Server cert + key
      - ./nginx/trusted-cas:/etc/nginx/cas  # CA chain for client cert validation
    depends_on:
      - api

  api:
    # existing Express API service
    environment:
      - TRUSTED_PROXY=nginx  # Only trust cert headers from NGINX
```

### CA Chain File Management

The
`trusted-cas/chain.pem` file used by NGINX for client cert verification must be updated whenever:

- A new intermediate CA is created (add its cert to the chain)
- A CA is revoked (remove from chain)

This can be automated via a service that generates the chain PEM from active CAs in the database and writes it to the shared volume, then signals NGINX to reload.

---

## 14. Production Readiness

This section covers requirements that are often missed in initial design but are critical for running a CA management system in production.

### Backup & Disaster Recovery

| What | Strategy | Frequency |
|------|----------|-----------|
| **PostgreSQL database** | Automated pg_dump with point-in-time recovery (WAL archiving). Encrypted backups to S3/object storage. | Continuous WAL + daily full dump |
| **CA private keys** | Encrypted key material lives in DB, so DB backups cover this. Additionally, export encrypted key backups to a separate secure location (different cloud account or offline media). | On every CA creation + weekly verification |
| **NGINX CA chain file** | Regenerated from DB on demand; no separate backup needed. | N/A (derived) |
| **Audit logs** | Part of DB backup. For compliance, also stream to an append-only external store (S3 with Object Lock, or a SIEM). | Continuous |

**Recovery procedure**: Document and regularly test restoring from backup — including decrypting CA keys with the admin passphrase, regenerating the NGINX trust chain, and verifying the CRL is current.

**Recovery Time Objective (RTO)**: Define acceptable downtime. Certificate issuance can be paused, but CRL distribution must remain available (relying parties need it).

### Rate Limiting

| Endpoint | Limit | Rationale |
|----------|-------|-----------|
| `POST /api/v2/certificates/issue` | 50/hour per admin | Prevent accidental mass issuance |
| `POST /api/v2/certificates/requests` | 20/hour per user | CSR spam prevention |
| `POST /api/v2/auth/cert-login` | 10/minute per IP | Brute-force cert-login attempts |
| `POST /api/v2/auth/cert-attach/code` | 5/hour per user | Matches Portal's proven limit |
| `GET /api/v2/ca/:id/crl` | 100/minute per IP | Public endpoint; prevent DDoS |
| `POST /api/v2/ca/:id/crl/generate` | 5/hour per CA | CRL generation is expensive |

Implement via middleware (e.g., `express-rate-limit` + Redis store for multi-instance deployments).

### Health Checks & Monitoring

**Liveness/readiness probes:**

```
GET /api/v2/health/live     → { status: "ok" }  (process alive)
GET /api/v2/health/ready    → { status: "ok", db: "connected", ... }  (ready to serve)
```

**Metrics to expose (Prometheus/OpenTelemetry):**

- `pki_certificates_total` (gauge, by status: active/revoked/expired)
- `pki_certificates_expiring_soon` (gauge, certs expiring within 30 days)
- `pki_crl_age_seconds` (gauge per CA, time since last CRL generation)
- `pki_cert_issuance_total` (counter, by CA and profile)
- `pki_cert_login_total` (counter, by success/failure)
- `pki_crl_next_update` (gauge per CA, Unix timestamp of CRL expiry)

**Alerts to configure:**

| Alert | Condition | Severity |
|-------|-----------|----------|
| CRL stale | `nextUpdate < now` for any active CA | Critical |
| CRL expiring soon | `nextUpdate < now + 24h` | Warning |
| Certs expiring (bulk) | > 10 certs expiring within 7 days | Warning |
| CA cert expiring | Any CA cert expiring within 90 days | Critical |
| Failed cert logins (spike) | > 20 failures in 5 minutes from same IP | Warning |
| Audit log write failure | Any audit log insert fails | Critical |

### Database Encryption at Rest

CA private keys are encrypted at the application layer (Argon2id + AES-256-GCM) before storage. Additionally:

- **PostgreSQL TDE** (Transparent Data Encryption) or **filesystem-level encryption** (LUKS, AWS EBS encryption) should be enabled on the database volume
- **Connection encryption**: All DB connections must use TLS (`sslmode=require` in connection string)
- **Column-level considerations**: The `encrypted_private_key_pem` column contains the most sensitive data. Even with app-layer encryption, DB-level encryption adds defense-in-depth.

### Encryption Key Rotation

Plan for rotating the system-level encryption used for end-entity private keys (where the system manages the key, not a user passphrase):

1. Generate new system encryption key
2. Re-encrypt all affected `private_keys` records with the new key inside a transaction
3. Update the active key reference in configuration
4. Retain the old key in a "decrypt-only" state until rotation is verified
5. Audit log the rotation event

CA passphrases are user-managed and not rotatable by the system — the admin must create a new CA if they want to change the passphrase.

### Session Management for Cert Login

- **JWT issued on cert login** should include `authMethod: "x509"` claim for downstream policy decisions
- **Refresh tokens**: Cert-login JWTs follow the same refresh flow as password-login JWTs
- **Revocation propagation**: When a user's certificate binding is removed or their cert is revoked, invalidate any active sessions authenticated via that cert (add cert binding ID to JWT claims, check against revocation on token refresh)
- **Concurrent bindings**: Users may have multiple certs bound (e.g., "Work Laptop" and "YubiKey"). Each binding can be independently suspended/removed.

### CORS & Multi-Origin Considerations

The mTLS port (8443) is a different origin than the standard HTTPS port (443). The frontend must:

- Make cert-login requests to `https://app.example.com:8443/api/v2/auth/cert-login` (different port = different origin)
- CORS on the mTLS server block must allow the main app origin
- Cert-attach flow may use a redirect or popup window to the mTLS origin

```nginx
# In the mTLS server block
add_header Access-Control-Allow-Origin https://app.example.com;
add_header Access-Control-Allow-Methods "POST, OPTIONS";
add_header Access-Control-Allow-Headers "Content-Type, Authorization";
add_header Access-Control-Allow-Credentials true;
```

### Input Sanitization & DN Injection

Certificate Distinguished Names (DNs) come from X.509 certificate fields and are forwarded by NGINX as HTTP headers. These MUST be treated as untrusted input:

- **DN parsing**: Use a proper DN parser, not string splitting — DNs can contain escaped commas, plus signs, and other special characters (RFC 4514)
- **Database queries**: Always use parameterized queries (Drizzle handles this) — never interpolate DN strings into SQL
- **Header stripping**: The API MUST strip `x-ssl-*` headers from any request not arriving via the trusted proxy. Middleware should reject or ignore these headers when the request source is not the NGINX proxy IP.
- **Display**: HTML-encode DN/CN values before rendering in the UI to prevent XSS

### Log Retention & Archival

Audit logs will grow indefinitely. Plan for:

- **Hot storage** (PostgreSQL): Last 90 days, indexed and queryable via the UI
- **Warm storage** (S3/object storage): 90 days to 7 years, archived as compressed JSON/CSV. Queryable via Athena or similar.
- **Retention policy**: Minimum 7 years for compliance (aligns with SOC 2 and most regulatory frameworks). Configure as an environment variable.
- **Partition strategy**: Partition `pki_audit_logs` by month using PostgreSQL native partitioning to enable efficient archival and deletion of old partitions

### Certificate Import/Export

For interoperability with external tools, CAs, and migration scenarios:

**Import:**
- Import an existing CA (cert + encrypted private key) to manage it within the system
- Import externally-signed certificates for tracking/monitoring (without private key)
- Import external CA certificates as trust anchors (for cert-login trust chain)

**Export:**
- Export certificates in PEM, DER, PKCS#7 (chain), and PKCS#12 (cert + key bundle)
- Export CA certificate chain for distribution to relying parties
- Export CRL in PEM and DER formats
- Bulk export for backup or migration purposes

### Graceful Degradation

| Failure Scenario | System Behavior |
|------------------|----------------|
| DB unavailable | Cert login fails (cannot look up bindings). CRL download serves cached copy from NGINX or CDN. New issuance blocked. |
| NGINX mTLS port down | Cert login unavailable; password login unaffected. CRL still available if served from separate path. |
| CA passphrase incorrect | Signing operation fails with clear error. No partial state changes (transaction rolled back). |
| CRL generation fails | Log critical alert. Previous CRL remains valid until `nextUpdate`. Admin notified to investigate. |
| Audit log write fails | **Block the operation**. A CA operation without an audit record must not succeed. Fail the parent operation and alert. |

---

## 15. Open Questions

| # | Question                                                                                                                                                   | Options                                                                  | Impact                        |
|---|------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|-------------------------------|
| 1 | **Crypto library**: `node-forge` (pure JS, well-tested) vs. OpenSSL child process (battle-tested, heavier) vs. `@peculiar/x509` (modern, WebCrypto-based)? | Recommend `node-forge` for v1 with OpenSSL fallback for CRL              | Affects all crypto operations |
| 2 | **CA passphrase session caching**: Allow temporary in-memory caching for batch operations, or require passphrase per-request?                              | Per-request is more secure; caching is more usable for batch issuance    | UX vs security trade-off      |
| 3 | **Approval workflows**: Require multi-person approval for cert issuance in v1, or add later?                                                               | Skip for v1, add as a feature flag later                                 | Complexity vs security        |
| 4 | **Certificate storage**: Store full PEM in PostgreSQL, or store on filesystem/S3 with DB reference?                                                        | DB for v1 (simpler); S3 for scale later                                  | Storage architecture          |
| 5 | **OCSP responder**: Build as part of this service, or as a separate microservice?                                                                          | Separate service (different availability requirements)                   | Deployment complexity         |
| 6 | **Short-lived certs**: Support automatic renewal via ACME-like protocol for service certs?                                                                 | Not in v1; design the profile system to support short TTLs               | Future extensibility          |
| 7 | **Key escrow**: Should the system retain end-entity private keys for recovery, or generate-and-forget?                                                     | Retain encrypted keys for user certs (recovery); forget for server certs | Security policy               |
| 8 | **Multi-tenancy**: Should CAs be scoped to organizations/tenants?                                                                                          | Design for it (add `organizationId` FK to CAs) but don't enforce in v1   | Schema design                 |

---

## Appendix A: Technology Choices

| Concern        | Choice                               | Rationale                                                                                                           |
|----------------|--------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| Crypto         | `node-forge` + OpenSSL fallback      | node-forge handles key gen, CSR, cert signing, PKCS#12 in pure JS. OpenSSL for CRL and complex extension scenarios. |
| Key encryption | AES-256-GCM with Argon2id KDF        | Industry standard. Argon2id is the recommended password-hashing/KDF algorithm (memory-hard, resists GPU attacks).   |
| Database       | PostgreSQL via Drizzle ORM           | Matches fullstack-template stack. Relational model is natural fit for CA hierarchy + certificate metadata.          |
| Reverse proxy  | NGINX                                | Proven mTLS termination. Portal Server validates this approach in production.                                       |
| Frontend       | React + Material UI + TanStack Query | Matches fullstack-template stack.                                                                                   |
| Audit logging  | PostgreSQL table (append-only)       | Simple, queryable, no additional infrastructure.                                                                    |

## Appendix B: Reference Implementations

| System             | What We Borrowed                                                                                                                     |
|--------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| **Portal Server**  | mTLS via NGINX headers, cert-to-account binding with one-time attach codes, policy-based second factor, session management patterns  |
| **Wormhole-Certs** | OpenSSL extension profiles (client vs server), audit logging patterns, lessons on limitations of single-tier CLI-only CA management   |
| **EJBCA**          | Separate certificate profiles vs end-entity profiles concept, approval workflows design, audit log schema patterns                   |
| **step-ca**        | Two-tier hierarchy as default, provisioner concept (adapted as certificate profiles), short-lived cert model                          |
| **BounCA**         | Web UI patterns for CA hierarchy visualization, certificate creation wizard flow                                                     |
| **Vault PKI**      | Role-based issuance patterns, TTL-driven lifecycle concepts                                                                          |
