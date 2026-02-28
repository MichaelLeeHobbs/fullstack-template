# ADR-009: PKI with Database-Backed CA

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | pki, security, certificates, mtls |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The application requires a built-in Certificate Authority (CA) system to support mutual TLS (mTLS) authentication, certificate-based device identity, and internal service authentication. Traditional file-based CA tools (OpenSSL CLI, step-ca) store private keys on the filesystem, which creates operational challenges: key files must be protected with filesystem permissions, backed up separately from the database, and do not scale across multiple application instances. The template needs a CA that is manageable through the admin UI, auditable, and operationally integrated with the existing PostgreSQL database.

## Decision

Implement a full PKI system with database-backed storage using Node.js `node:crypto` for all cryptographic operations:

**Certificate hierarchy**: Root CA -> Intermediate CA(s) -> End-Entity certificates. Root CA private keys are generated once and can be kept offline (not used for day-to-day signing). Intermediate CAs handle routine certificate issuance.

**Key storage**: Private keys are encrypted at rest using AES-256-GCM with key derivation via Argon2id before storage in the `pki_private_keys` table. The encryption passphrase is derived from a server-side secret. Decryption happens in-memory only during signing operations.

**Database tables**:
- `certificate_authorities` -- CA metadata, status, hierarchy relationships
- `certificates` -- Issued certificates with serial numbers, validity periods, subject info
- `pki_private_keys` -- Encrypted private keys linked to CAs
- `certificate_profiles` -- Templates defining key usage, validity, and extensions per certificate type
- `revocations` -- Revoked certificates with reason codes
- `crls` -- Certificate Revocation Lists generated on a schedule
- `certificate_requests` -- CSR processing workflow
- `user_certificates` -- Maps certificates to user accounts for mTLS login
- `pki_audit_logs` -- All PKI operations logged for compliance

**Certificate-based login**: Users can attach X.509 client certificates to their accounts and authenticate via mTLS as an alternative to password-based login.

## Consequences

### Positive

- All PKI state lives in PostgreSQL -- standard database backups cover the entire CA
- Multi-instance deployments share the same CA without filesystem synchronization
- Admin UI provides certificate management, issuance, and revocation without CLI tools
- Full audit trail of all PKI operations in the database
- AES-256-GCM + Argon2id encryption provides strong key-at-rest protection

### Negative

- Private keys exist in application memory during signing -- compromised process memory exposes keys
- Not suitable for high-security environments requiring HSM (Hardware Security Module) integration
- Custom PKI implementation requires careful security review -- not as battle-tested as established CA software
- Certificate validation and chain building adds complexity compared to delegating to an external CA
- Database size grows with certificate and CRL data over time

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| External CA (Let's Encrypt, step-ca) | Battle-tested, HSM support, standards-compliant | External dependency, not integrated with app DB, separate management plane | Rejected |
| File-based OpenSSL CA | Well-documented, standard tools | Filesystem-dependent, no multi-instance, no UI, manual process | Rejected |
| Vault PKI secrets engine | Enterprise-grade, HSM support, policy engine | Heavy infrastructure dependency (Vault cluster), operational complexity | Rejected |
| **Database-backed CA with node:crypto** | Integrated with app, database-backed, auditable, UI-manageable | In-memory key exposure, custom implementation risk, no HSM | **Selected** |
