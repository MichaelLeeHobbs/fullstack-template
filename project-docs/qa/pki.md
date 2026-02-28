# Test Cases: PKI (Public Key Infrastructure)

> **[Template]** Base template test cases. Extend for your project.
> Traceability: US-PKI-001 through US-PKI-030

## CA Management

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-PKI-001 | Create root CA | Admin authenticated; no root CA exists or multiple allowed | 1. POST `/api/pki/cas` with type "root", commonName, organization, validity period, and key algorithm | 201 Created; response contains CA object with id, commonName, type=root, status=active, certificate details | US-PKI-001 | P0 | Yes |
| TC-PKI-002 | Create intermediate CA | Admin authenticated; active root CA exists | 1. POST `/api/pki/cas` with type "intermediate", parentCaId pointing to root CA, commonName, and validity period | 201 Created; response contains intermediate CA signed by root CA; CA hierarchy is established | US-PKI-002 | P0 | Yes |
| TC-PKI-003 | List CAs | Admin authenticated; one or more CAs exist | 1. GET `/api/pki/cas` with admin authentication | 200 OK; response contains array of all CAs with id, commonName, type, status, issuer info, and validity dates | US-PKI-003 | P0 | Yes |
| TC-PKI-004 | Get CA hierarchy | Admin authenticated; root and intermediate CAs exist | 1. GET `/api/pki/cas/hierarchy` with admin authentication | 200 OK; response contains tree structure showing root CA(s) with nested intermediate CAs as children | US-PKI-004 | P1 | Yes |
| TC-PKI-005 | Get CA by ID | Admin authenticated; CA exists | 1. GET `/api/pki/cas/:id` with valid CA ID | 200 OK; response contains full CA object including certificate details, key info, status, and statistics | US-PKI-005 | P0 | Yes |
| TC-PKI-006 | Update CA metadata | Admin authenticated; CA exists | 1. PATCH `/api/pki/cas/:id` with updated description or tags | 200 OK; CA metadata is updated; response contains updated CA object | US-PKI-006 | P1 | Yes |
| TC-PKI-007 | Suspend CA | Admin authenticated; active CA exists | 1. POST `/api/pki/cas/:id/suspend` with admin authentication | 200 OK; CA status changes to suspended; CA can no longer issue new certificates until reactivated | US-PKI-007 | P0 | Yes |
| TC-PKI-008 | Retire CA | Admin authenticated; CA exists (active or suspended) | 1. POST `/api/pki/cas/:id/retire` with admin authentication | 200 OK; CA status changes to retired; CA is permanently decommissioned and cannot issue certificates | US-PKI-008 | P1 | Yes |

## Certificates

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-PKI-009 | Issue certificate | Admin authenticated; active CA exists; valid profile exists | 1. POST `/api/pki/certificates` with caId, profileId, commonName, and subject details | 201 Created; response contains certificate object with id, serialNumber, commonName, validity dates, and issuing CA reference | US-PKI-009 | P0 | Yes |
| TC-PKI-010 | List certificates | Admin authenticated; certificates exist | 1. GET `/api/pki/certificates` with admin authentication | 200 OK; response contains paginated array of certificates with id, serialNumber, commonName, status, and validity dates | US-PKI-010 | P0 | Yes |
| TC-PKI-011 | Get certificate by ID | Admin authenticated; certificate exists | 1. GET `/api/pki/certificates/:id` with valid certificate ID | 200 OK; response contains full certificate object including subject, issuer, validity, extensions, and status | US-PKI-011 | P0 | Yes |
| TC-PKI-012 | Download certificate in PEM format | Admin authenticated; certificate exists | 1. GET `/api/pki/certificates/:id/download?format=pem` with valid certificate ID | 200 OK; response Content-Type is application/x-pem-file; body contains PEM-encoded certificate | US-PKI-012 | P0 | Yes |
| TC-PKI-013 | Get certificate chain | Admin authenticated; certificate issued by intermediate CA exists | 1. GET `/api/pki/certificates/:id/chain` with valid certificate ID | 200 OK; response contains ordered array of certificates from end-entity through intermediate(s) to root CA | US-PKI-013 | P1 | Yes |
| TC-PKI-014 | Revoke certificate | Admin authenticated; active certificate exists | 1. POST `/api/pki/certificates/:id/revoke` with admin authentication | 200 OK; certificate status changes to revoked; certificate serial added to next CRL generation | US-PKI-014 | P0 | Yes |
| TC-PKI-015 | Revoke certificate with reason code | Admin authenticated; active certificate exists | 1. POST `/api/pki/certificates/:id/revoke` with reasonCode (e.g., "keyCompromise") | 200 OK; certificate is revoked; the specified reason code is stored and reflected in the certificate record and CRL entry | US-PKI-015 | P1 | Yes |
| TC-PKI-016 | Renew certificate | Admin authenticated; certificate exists (active or near expiry) | 1. POST `/api/pki/certificates/:id/renew` with admin authentication | 201 Created; new certificate issued with same subject and new validity period; new serial number; old certificate optionally revoked | US-PKI-016 | P0 | Yes |

## CRL (Certificate Revocation List)

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-PKI-017 | Generate CRL | Admin authenticated; CA exists with revoked certificates | 1. POST `/api/pki/cas/:id/crl/generate` with admin authentication | 201 Created; new CRL generated containing all revoked certificate serial numbers for the CA; CRL has valid thisUpdate and nextUpdate fields | US-PKI-017 | P0 | Yes |
| TC-PKI-018 | Get latest CRL | Admin authenticated; CRL has been generated for CA | 1. GET `/api/pki/cas/:id/crl/latest` with admin authentication | 200 OK; response contains the most recent CRL for the CA with list of revoked serial numbers, thisUpdate, and nextUpdate | US-PKI-018 | P0 | Yes |
| TC-PKI-019 | Get CRL history (paginated) | Admin authenticated; multiple CRLs generated for CA | 1. GET `/api/pki/cas/:id/crl?page=1&limit=10` with admin authentication | 200 OK; response contains paginated list of CRL records with crlNumber, generatedAt, and entry count | US-PKI-019 | P1 | Yes |
| TC-PKI-020 | Public CRL download in DER format | CRL has been generated for CA; public endpoint | 1. GET `/api/pki/crl/:caId/download` (no authentication required) | 200 OK; response Content-Type is application/pkix-crl; body contains DER-encoded CRL suitable for client consumption | US-PKI-020 | P0 | Yes |

## Certificate Profiles

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-PKI-021 | Create certificate profile | Admin authenticated | 1. POST `/api/pki/profiles` with name, keyUsage, extendedKeyUsage, validity period, and allowed key algorithms | 201 Created; response contains profile object with id, name, and all configuration fields | US-PKI-021 | P0 | Yes |
| TC-PKI-022 | List certificate profiles | Admin authenticated; profiles exist | 1. GET `/api/pki/profiles` with admin authentication | 200 OK; response contains array of all certificate profiles with id, name, and summary of constraints | US-PKI-022 | P0 | Yes |
| TC-PKI-023 | Get certificate profile by ID | Admin authenticated; profile exists | 1. GET `/api/pki/profiles/:id` with valid profile ID | 200 OK; response contains full profile object including keyUsage, extendedKeyUsage, validity, and all constraints | US-PKI-023 | P1 | Yes |
| TC-PKI-024 | Update certificate profile | Admin authenticated; profile exists | 1. PATCH `/api/pki/profiles/:id` with updated fields (e.g., new validity period) | 200 OK; profile is updated; response contains updated profile object; existing certificates not affected | US-PKI-024 | P1 | Yes |
| TC-PKI-025 | Delete certificate profile | Admin authenticated; profile exists; no certificates reference it | 1. DELETE `/api/pki/profiles/:id` with valid profile ID | 200 OK; profile is removed; subsequent GET returns 404 | US-PKI-025 | P1 | Yes |

## CSR (Certificate Signing Request)

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-PKI-026 | Submit CSR | User authenticated; CA and profile exist | 1. POST `/api/pki/csrs` with PEM-encoded CSR, target caId, and profileId | 201 Created; response contains CSR record with id, commonName parsed from CSR, status=pending, and submittedAt | US-PKI-026 | P0 | Yes |
| TC-PKI-027 | List CSRs | Admin authenticated; CSRs exist | 1. GET `/api/pki/csrs` with admin authentication | 200 OK; response contains paginated array of CSR records with id, commonName, status, submittedBy, and submittedAt | US-PKI-027 | P0 | Yes |
| TC-PKI-028 | Get CSR by ID | Admin authenticated; CSR exists | 1. GET `/api/pki/csrs/:id` with valid CSR ID | 200 OK; response contains full CSR record including parsed subject, key info, requested extensions, and status | US-PKI-028 | P1 | Yes |
| TC-PKI-029 | Approve CSR and issue certificate | Admin authenticated; pending CSR exists | 1. POST `/api/pki/csrs/:id/approve` with admin authentication | 200 OK; CSR status changes to approved; certificate is issued based on CSR subject and profile; response includes issued certificate reference | US-PKI-029 | P0 | Yes |
| TC-PKI-030 | Reject CSR | Admin authenticated; pending CSR exists | 1. POST `/api/pki/csrs/:id/reject` with optional rejectionReason | 200 OK; CSR status changes to rejected; rejection reason is stored; no certificate is issued | US-PKI-030 | P1 | Yes |
