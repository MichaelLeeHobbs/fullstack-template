# PKI (Public Key Infrastructure) User Stories

> **[Template]** Base template stories. Extend for your project.

---

## US-PKI-001: Create Root CA

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/ca |
| **Components** | CaCreatePage, CaController.create(), CaService, useCa hook |

**As a** PKI administrator, **I want to** create a self-signed root Certificate Authority with a passphrase, **so that** I can establish the trust anchor for my certificate hierarchy.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can create a root CA by providing subject fields, key algorithm, validity period, and passphrase | TC-PKI-001 |
| 2 | Root CA is self-signed (no parent CA required) | TC-PKI-002 |
| 3 | CA private key is encrypted with the provided passphrase before storage | TC-PKI-003 |
| 4 | Successful creation returns 201 with the CA metadata (not the private key) | TC-PKI-004 |
| 5 | CA can be listed via GET /api/v1/ca with optional query filters | TC-PKI-005 |
| 6 | CA details can be retrieved by ID via GET /api/v1/ca/:id | TC-PKI-006 |
| 7 | CA hierarchy can be viewed via GET /api/v1/ca/hierarchy | TC-PKI-007 |
| 8 | Requires `ca:create` permission; insufficient permission returns 403 Forbidden | TC-PKI-008 |
| 9 | PKI audit event is recorded for CA creation | TC-PKI-009 |

---

## US-PKI-002: Create Intermediate CA

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/ca |
| **Components** | CaCreatePage, CaController.create(), CaService, useCa hook |

**As a** PKI administrator, **I want to** create an intermediate CA signed by a parent CA, **so that** I can delegate certificate issuance while maintaining a chain of trust.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can create an intermediate CA by specifying a parentCaId | TC-PKI-010 |
| 2 | The intermediate CA certificate is signed by the parent CA's private key | TC-PKI-011 |
| 3 | Parent CA passphrase is required to sign the intermediate CA certificate | TC-PKI-012 |
| 4 | The intermediate CA inherits trust from its parent in the CA hierarchy | TC-PKI-013 |
| 5 | CA chain can be retrieved via GET /api/v1/ca/:id/chain | TC-PKI-014 |
| 6 | CA can be suspended via POST /api/v1/ca/:id/suspend (requires `ca:update` permission) | TC-PKI-015 |
| 7 | CA can be retired via POST /api/v1/ca/:id/retire (requires `ca:update` permission) | TC-PKI-016 |
| 8 | CA metadata can be updated via PATCH /api/v1/ca/:id (requires `ca:update` permission) | TC-PKI-017 |

---

## US-PKI-003: Issue Certificate

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/certificates/issue, GET /api/v1/certificates, GET /api/v1/certificates/:id, GET /api/v1/certificates/:id/download, GET /api/v1/certificates/:id/chain |
| **Components** | CertificateIssuePage, CertificateListPage, CertificateDetailPage, CertificateController.issue(), CertificateService, useCertificates hook |

**As a** PKI administrator, **I want to** issue an end-entity certificate from a CA using a certificate profile, **so that** services and users can establish secure communications.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can issue a certificate by specifying CA ID, profile ID, subject fields, and CA passphrase | TC-PKI-018 |
| 2 | Certificate is signed by the specified CA's private key | TC-PKI-019 |
| 3 | Certificate profile determines key usage, extended key usage, and validity period | TC-PKI-020 |
| 4 | Issued certificates can be listed with pagination and filters via GET /api/v1/certificates | TC-PKI-021 |
| 5 | Individual certificate details can be retrieved via GET /api/v1/certificates/:id | TC-PKI-022 |
| 6 | Certificate can be downloaded via GET /api/v1/certificates/:id/download | TC-PKI-023 |
| 7 | Certificate chain can be retrieved via GET /api/v1/certificates/:id/chain | TC-PKI-024 |
| 8 | Requires `certificates:issue` permission; insufficient permission returns 403 Forbidden | TC-PKI-025 |
| 9 | PKI audit event is recorded for certificate issuance | TC-PKI-026 |

---

## US-PKI-004: Revoke Certificate

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/certificates/:id/revoke |
| **Components** | CertificateDetailPage (revoke action), CertificateLifecycleController.revoke(), CertificateLifecycleService |

**As a** PKI administrator, **I want to** revoke a certificate with an RFC 5280 reason code, **so that** compromised or obsolete certificates are formally invalidated and appear on CRLs.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can revoke a certificate by providing its UUID and an RFC 5280 reason code | TC-PKI-027 |
| 2 | Supported reason codes include: keyCompromise, cACompromise, affiliationChanged, superseded, cessationOfOperation, certificateHold, removeFromCRL, privilegeWithdrawn, aACompromise | TC-PKI-028 |
| 3 | Revoked certificate status is updated in the database | TC-PKI-029 |
| 4 | Revoked certificates are excluded from active certificate listings | TC-PKI-030 |
| 5 | Certificate renewal is available via POST /api/v1/certificates/:id/renew (requires `certificates:renew` permission) | TC-PKI-031 |
| 6 | Requires `certificates:revoke` permission; insufficient permission returns 403 Forbidden | TC-PKI-032 |
| 7 | PKI audit event is recorded for certificate revocation | TC-PKI-033 |

---

## US-PKI-005: Generate CRL

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/ca/:id/crl, GET /api/v1/ca/:id/crl/latest, GET /api/v1/ca/:id/crl/latest.der, GET /api/v1/ca/:id/crl/history |
| **Components** | CaDetailPage (CRL section), CrlController.generate(), CrlController.getLatest(), CrlController.getLatestDer(), CrlService, useCrl hook |

**As a** PKI administrator, **I want to** generate a signed Certificate Revocation List for a CA, **so that** relying parties can verify certificate revocation status.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can generate a CRL for a CA by providing the CA passphrase | TC-PKI-034 |
| 2 | CRL includes all certificates revoked under the specified CA | TC-PKI-035 |
| 3 | CRL is signed by the CA's private key | TC-PKI-036 |
| 4 | Latest CRL can be retrieved via GET /api/v1/ca/:id/crl/latest (authenticated) | TC-PKI-037 |
| 5 | CRL in DER format is available publicly via GET /api/v1/ca/:id/crl/latest.der (no auth required) | TC-PKI-038 |
| 6 | CRL history can be listed with pagination via GET /api/v1/ca/:id/crl/history | TC-PKI-039 |
| 7 | Requires `crl:generate` permission for generation, `crl:read` permission for viewing | TC-PKI-040 |
| 8 | PKI audit event is recorded for CRL generation | TC-PKI-041 |

---

## US-PKI-006: CSR Workflow

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/certificates/requests, GET /api/v1/certificates/requests, GET /api/v1/certificates/requests/:id, POST /api/v1/certificates/requests/:id/approve, POST /api/v1/certificates/requests/:id/reject |
| **Components** | CsrListPage, CsrDetailPage, CsrController.submit(), CsrController.approve(), CsrController.reject(), CsrService, useCsr hook |

**As a** certificate requestor, **I want to** submit a Certificate Signing Request (CSR) for admin approval, **so that** I can obtain a signed certificate through a governed workflow.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can submit a CSR with the required fields (CSR PEM, CA ID, profile ID) | TC-PKI-042 |
| 2 | Submitted CSRs can be listed with pagination and filters via GET /api/v1/certificates/requests | TC-PKI-043 |
| 3 | Individual CSR details can be retrieved by ID via GET /api/v1/certificates/requests/:id | TC-PKI-044 |
| 4 | Admin can approve a CSR via POST /api/v1/certificates/requests/:id/approve (with CA passphrase) | TC-PKI-045 |
| 5 | Approving a CSR issues a signed certificate based on the CSR and profile | TC-PKI-046 |
| 6 | Admin can reject a CSR via POST /api/v1/certificates/requests/:id/reject (with rejection reason) | TC-PKI-047 |
| 7 | Requires `csr:submit` permission for submission, `csr:approve` permission for approve/reject | TC-PKI-048 |
| 8 | Requires `csr:read` permission for listing and viewing CSRs | TC-PKI-049 |
| 9 | PKI audit events are recorded for CSR submission, approval, and rejection | TC-PKI-050 |

---

## US-PKI-007: Certificate Profiles

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/profiles, GET /api/v1/profiles, GET /api/v1/profiles/:id, PATCH /api/v1/profiles/:id, DELETE /api/v1/profiles/:id |
| **Components** | ProfileListPage, ProfileFormPage, CertificateProfileController, CertificateProfileService, useCertificateProfiles hook |

**As a** PKI administrator, **I want to** create and manage certificate templates (profiles), **so that** certificates are issued with consistent key usage, extended key usage, and validity settings.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can create a certificate profile with name, key usage flags, extended key usage, and validity period | TC-PKI-051 |
| 2 | Profiles can be listed with pagination and filters via GET /api/v1/profiles | TC-PKI-052 |
| 3 | Individual profile details can be retrieved by ID via GET /api/v1/profiles/:id | TC-PKI-053 |
| 4 | Admin can update a profile via PATCH /api/v1/profiles/:id | TC-PKI-054 |
| 5 | Admin can delete a profile via DELETE /api/v1/profiles/:id | TC-PKI-055 |
| 6 | Profiles define default validity period, key usage, and extended key usage for issued certificates | TC-PKI-056 |
| 7 | Requires `profiles:create` for creation, `profiles:read` for listing/viewing, `profiles:update` for updating, `profiles:delete` for deletion | TC-PKI-057 |

---

## US-PKI-008: Certificate-Based Login

| Field | Value |
|-------|-------|
| **Priority** | P2 - Medium |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/cert-login, POST /api/v1/cert-attach, POST /api/v1/cert-attach/code, GET /api/v1/cert-status, DELETE /api/v1/cert-binding/:id |
| **Components** | CertLoginController.login(), CertLoginController.attachCertificate(), CertLoginController.generateAttachCode(), CertLoginService, useCertLogin hook |

**As a** user with a client certificate, **I want to** log in via mTLS and manage my certificate bindings, **so that** I can authenticate securely without passwords.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can log in via POST /api/v1/cert-login using client certificate headers forwarded by NGINX (x-ssl-* headers) | TC-PKI-058 |
| 2 | Successful mTLS login returns accessToken and user data | TC-PKI-059 |
| 3 | Unbound certificate returns 401 Unauthorized | TC-PKI-060 |
| 4 | Authenticated user can generate a one-time attach code via POST /api/v1/cert-attach/code (valid for 15 minutes) | TC-PKI-061 |
| 5 | Client certificate can be bound to a user account via POST /api/v1/cert-attach using the one-time code | TC-PKI-062 |
| 6 | Attaching a certificate already bound to another account returns 409 Conflict | TC-PKI-063 |
| 7 | Invalid or expired attach code returns 400 Bad Request | TC-PKI-064 |
| 8 | User can view all their certificate bindings via GET /api/v1/cert-status | TC-PKI-065 |
| 9 | User can remove a certificate binding via DELETE /api/v1/cert-binding/:id | TC-PKI-066 |
| 10 | Non-existent binding returns 404 Not Found | TC-PKI-067 |
| 11 | Attach code generation is rate-limited to 5 codes per hour | TC-PKI-068 |

---
