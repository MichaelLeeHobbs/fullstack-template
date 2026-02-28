# ADR-010: TOTP-Based MFA

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | auth, mfa, security, totp |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The application needs multi-factor authentication to protect user accounts against credential theft, phishing, and password reuse attacks. The MFA solution must work offline (no SMS delivery dependency), be compatible with standard authenticator apps (Google Authenticator, Authy, 1Password), and integrate with the existing JWT authentication flow (ADR-003). The implementation should be extensible for future MFA methods (WebAuthn, hardware keys) without redesigning the authentication flow.

## Decision

Implement TOTP (Time-based One-Time Password) as the primary MFA method using the `otpauth` library, following RFC 6238:

**Enrollment flow**:
1. User requests MFA setup -- server generates a random TOTP secret
2. Secret is returned as a QR code (via `qrcode` library) and a manual entry key
3. User scans the QR code in their authenticator app and submits a verification code
4. On successful verification, the secret is encrypted (AES-256-GCM) and stored in `user_mfa_methods`
5. Server generates 10 single-use backup codes, bcrypt-hashes them, and stores the hashes
6. Plaintext backup codes are returned to the user once (never stored or retrievable again)

**Login flow with MFA**:
1. User submits email/password -- credentials are verified
2. If MFA is enabled, the server returns a short-lived MFA temp token (JWT) instead of full auth tokens
3. Frontend redirects to the MFA verification screen
4. User submits TOTP code (or backup code) with the temp token
5. On successful verification, server issues full access + refresh tokens

**Backup codes**: Each backup code is a random 8-character alphanumeric string. All 10 are bcrypt-hashed individually. Using a backup code marks it as consumed. Users can regenerate backup codes (which invalidates all previous ones).

**Secret storage**: TOTP secrets are encrypted with the application encryption key before database storage. The `MfaService` handles both encrypted and legacy plaintext secrets transparently for migration compatibility.

## Consequences

### Positive

- Works offline -- no SMS delivery infrastructure, no carrier fees, no phone number requirements
- Compatible with all standard TOTP authenticator apps without custom client software
- Backup codes provide account recovery when the authenticator device is lost
- MFA temp token pattern cleanly separates the two authentication steps without special session state
- Extensible schema (`user_mfa_methods` with method type column) supports adding WebAuthn or other methods later

### Negative

- TOTP requires time synchronization between server and client (30-second window with drift tolerance)
- Users must manage their authenticator app -- lost devices without backup codes result in account lockout
- Backup codes are a security/usability tradeoff: they bypass MFA but are necessary for recovery
- QR code provisioning requires a display-capable client (not suitable for headless API-only flows)
- TOTP codes are phishable (unlike WebAuthn) -- an attacker can relay the code in real time

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| SMS OTP | Familiar to users, no app required | SIM swap attacks, carrier dependency, delivery failures, cost per message | Rejected |
| Email OTP | No app required, works everywhere | Slow delivery, email compromise = MFA bypass, poor UX | Rejected |
| WebAuthn / FIDO2 | Phishing-resistant, hardware-backed | Complex implementation, requires hardware key or platform authenticator, limited browser support | Future addition |
| Push notification MFA | Good UX, app-based | Requires custom mobile app or third-party service (Duo, Auth0) | Rejected |
| **TOTP with otpauth** | Offline, standard, free, universal app support, extensible | Phishable, time-sync dependency, device loss risk | **Selected** |
