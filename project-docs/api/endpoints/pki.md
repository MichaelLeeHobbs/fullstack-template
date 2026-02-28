# PKI Endpoints

> **[Template]** This covers the base template feature. Extend or modify for your project.

Base URL: `/api/v1`

This document covers the Certificate Authority (CA) management, certificate lifecycle, certificate profiles, CSR workflow, and certificate-based login endpoints.

---

## Certificate Authority Management (`/ca`)

### POST /ca

Create a new Certificate Authority. If `parentCaId` is provided, creates an intermediate CA signed by the parent; otherwise creates a self-signed root CA.

**Authentication**: Required
**Permission**: `ca.create`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| name | body | string | Yes | -- | Display name (1-255 chars) |
| commonName | body | string | Yes | -- | CA common name for the subject DN |
| organization | body | string | No | -- | Organization name (max 255 chars) |
| organizationalUnit | body | string | No | -- | Organizational unit (max 255 chars) |
| country | body | string | No | -- | Two-letter country code (ISO 3166-1) |
| state | body | string | No | -- | State or province (max 128 chars) |
| locality | body | string | No | -- | City or locality (max 128 chars) |
| parentCaId | body | string (UUID) | No | -- | Parent CA ID (creates intermediate CA) |
| parentPassphrase | body | string | Conditional | -- | Required when `parentCaId` is set |
| passphrase | body | string | Yes | -- | Private key passphrase (min 8 chars) |
| keyAlgorithm | body | string | No | `rsa` | Key algorithm: `rsa` or `ecdsa` |
| keySize | body | integer | No | -- | RSA key size (2048-4096) |
| keyCurve | body | string | No | -- | ECDSA curve name |
| maxValidityDays | body | integer | No | 3650 | Maximum certificate validity (1-36500 days) |
| pathLenConstraint | body | integer | No | -- | CA path length constraint (min 0) |
| crlDistributionUrl | body | string (URL) | No | -- | CRL distribution point URL |
| ocspUrl | body | string (URL) | No | -- | OCSP responder URL |

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "id": "ca-uuid-...",
    "name": "My Root CA",
    "commonName": "My Root CA",
    "status": "active",
    "isRoot": true,
    "keyAlgorithm": "rsa",
    "keySize": 4096,
    "serialNumber": "01",
    "notBefore": "2025-01-15T00:00:00.000Z",
    "notAfter": "2035-01-15T00:00:00.000Z",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Missing required fields or invalid parameters |
| 400 | Parent passphrase required | `parentCaId` set but `parentPassphrase` missing |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `ca.create` permission |
| 404 | Parent CA not found | The specified parent CA does not exist |

---

### GET /ca

List Certificate Authorities with optional filtering.

**Authentication**: Required
**Permission**: `ca.read`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| page | query | integer | No | 1 | Page number |
| limit | query | integer | No | 20 | Items per page (max 100) |
| status | query | string | No | -- | Filter: `active`, `suspended`, `retired` |
| isRoot | query | string | No | -- | Filter: `"true"` or `"false"` |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "ca-uuid-...",
      "name": "My Root CA",
      "commonName": "My Root CA",
      "status": "active",
      "isRoot": true,
      "keyAlgorithm": "rsa",
      "certificateCount": 15,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `ca.read` permission |

---

### GET /ca/hierarchy

Get the full CA hierarchy as a tree structure, showing parent-child relationships.

**Authentication**: Required
**Permission**: `ca.read`

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "root-ca-uuid-...",
      "name": "Root CA",
      "status": "active",
      "children": [
        {
          "id": "intermediate-ca-uuid-...",
          "name": "Intermediate CA",
          "status": "active",
          "children": []
        }
      ]
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `ca.read` permission |

---

### GET /ca/:id

Get detailed information about a specific CA.

**Authentication**: Required
**Permission**: `ca.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CA ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "ca-uuid-...",
    "name": "My Root CA",
    "commonName": "My Root CA",
    "organization": "Example Corp",
    "status": "active",
    "isRoot": true,
    "parentCaId": null,
    "keyAlgorithm": "rsa",
    "keySize": 4096,
    "serialNumber": "01",
    "subjectDn": "CN=My Root CA, O=Example Corp",
    "notBefore": "2025-01-15T00:00:00.000Z",
    "notAfter": "2035-01-15T00:00:00.000Z",
    "maxValidityDays": 3650,
    "crlDistributionUrl": "https://pki.example.com/crl/root.crl",
    "certificatePem": "-----BEGIN CERTIFICATE-----\n...",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `ca.read` permission |
| 404 | Not found | CA does not exist |

---

### PATCH /ca/:id

Update a CA's metadata (name, validity settings, distribution URLs).

**Authentication**: Required
**Permission**: `ca.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CA ID |
| name | body | string | No | New display name (1-255 chars) |
| maxValidityDays | body | integer | No | New max validity (1-36500 days) |
| crlDistributionUrl | body | string / null | No | CRL distribution point URL |
| ocspUrl | body | string / null | No | OCSP responder URL |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "ca-uuid-...",
    "name": "Updated CA Name",
    "maxValidityDays": 730,
    "crlDistributionUrl": "https://pki.example.com/crl/updated.crl"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `ca.update` permission |
| 404 | Not found | CA does not exist |

---

### POST /ca/:id/suspend

Suspend a CA. A suspended CA cannot issue new certificates but existing certificates remain valid.

**Authentication**: Required
**Permission**: `ca.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CA ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "ca-uuid-...",
    "status": "suspended"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `ca.update` permission |
| 404 | Not found | CA does not exist |

---

### POST /ca/:id/retire

Permanently retire a CA. A retired CA cannot issue certificates or be reactivated.

**Authentication**: Required
**Permission**: `ca.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CA ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "ca-uuid-...",
    "status": "retired"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `ca.update` permission |
| 404 | Not found | CA does not exist |

---

### GET /ca/:id/chain

Get the full certificate chain for a CA, from the CA itself up to the root.

**Authentication**: Required
**Permission**: `ca.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CA ID |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "intermediate-ca-uuid-...",
      "commonName": "Intermediate CA",
      "certificatePem": "-----BEGIN CERTIFICATE-----\n..."
    },
    {
      "id": "root-ca-uuid-...",
      "commonName": "Root CA",
      "certificatePem": "-----BEGIN CERTIFICATE-----\n..."
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `ca.read` permission |
| 404 | Not found | CA does not exist |

---

## CRL Management (`/ca/:id/crl`)

### GET /ca/:id/crl/latest.der

Download the latest CRL in DER (binary) format. This is the public distribution endpoint -- no authentication required.

**Authentication**: None (public)

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CA ID |

**Success (200)**:

Response is binary DER-encoded CRL data with `Content-Type: application/pkix-crl`.

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 404 | Not found | CA or CRL does not exist |

---

### POST /ca/:id/crl

Generate a new Certificate Revocation List for a CA.

**Authentication**: Required
**Permission**: `crl.generate`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CA ID |
| caPassphrase | body | string | Yes | CA private key passphrase |

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "id": "crl-uuid-...",
    "caId": "ca-uuid-...",
    "crlNumber": 5,
    "thisUpdate": "2025-06-01T00:00:00.000Z",
    "nextUpdate": "2025-06-08T00:00:00.000Z",
    "revokedCount": 3,
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid passphrase | CA passphrase is incorrect |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `crl.generate` permission |
| 404 | Not found | CA does not exist |

---

### GET /ca/:id/crl/latest

Get metadata for the latest CRL (JSON format, not binary).

**Authentication**: Required
**Permission**: `crl.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CA ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "crl-uuid-...",
    "caId": "ca-uuid-...",
    "crlNumber": 5,
    "thisUpdate": "2025-06-01T00:00:00.000Z",
    "nextUpdate": "2025-06-08T00:00:00.000Z",
    "revokedCount": 3,
    "crlPem": "-----BEGIN X509 CRL-----\n...",
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `crl.read` permission |
| 404 | Not found | CA or CRL does not exist |

---

### GET /ca/:id/crl/history

List historical CRLs for a CA with pagination.

**Authentication**: Required
**Permission**: `crl.read`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| id | path | string (UUID) | Yes | -- | CA ID |
| page | query | integer | No | 1 | Page number |
| limit | query | integer | No | 20 | Items per page (max 100) |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "crl-uuid-...",
      "crlNumber": 5,
      "thisUpdate": "2025-06-01T00:00:00.000Z",
      "nextUpdate": "2025-06-08T00:00:00.000Z",
      "revokedCount": 3,
      "createdAt": "2025-06-01T14:22:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `crl.read` permission |
| 404 | Not found | CA does not exist |

---

## Certificate Profiles (`/profiles`)

Certificate profiles define templates for certificate issuance, specifying key usage, validity, and constraints.

### POST /profiles

Create a new certificate profile.

**Authentication**: Required
**Permission**: `profiles.create`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| name | body | string | Yes | -- | Profile name (1-255 chars) |
| description | body | string | No | -- | Description (max 1000 chars) |
| certType | body | string | Yes | -- | Certificate type: `server`, `client`, `user`, `ca`, `smime` |
| allowedKeyAlgorithms | body | string[] | No | `["rsa", "ecdsa"]` | Allowed algorithms |
| minKeySize | body | integer | No | 2048 | Minimum RSA key size (1024-8192) |
| keyUsage | body | string[] | Yes | -- | X.509 key usage extensions |
| extKeyUsage | body | string[] | No | `[]` | Extended key usage extensions |
| basicConstraints | body | object / null | No | -- | `{ca: boolean, pathLenConstraint?: number}` |
| maxValidityDays | body | integer | No | 365 | Maximum validity (1-36500 days) |
| subjectConstraints | body | object / null | No | -- | Constraints on subject fields |
| sanConstraints | body | object / null | No | -- | Constraints on Subject Alternative Names |

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "id": "profile-uuid-...",
    "name": "TLS Server",
    "description": "Standard TLS server certificate",
    "certType": "server",
    "allowedKeyAlgorithms": ["rsa", "ecdsa"],
    "minKeySize": 2048,
    "keyUsage": ["digitalSignature", "keyEncipherment"],
    "extKeyUsage": ["serverAuth"],
    "maxValidityDays": 365,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Missing required fields or invalid values |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `profiles.create` permission |

---

### GET /profiles

List certificate profiles with optional filtering.

**Authentication**: Required
**Permission**: `profiles.read`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| page | query | integer | No | 1 | Page number |
| limit | query | integer | No | 20 | Items per page (max 100) |
| certType | query | string | No | -- | Filter: `server`, `client`, `user`, `ca`, `smime` |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "profile-uuid-...",
      "name": "TLS Server",
      "certType": "server",
      "maxValidityDays": 365,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 4,
    "totalPages": 1
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `profiles.read` permission |

---

### GET /profiles/:id

Get a certificate profile by ID.

**Authentication**: Required
**Permission**: `profiles.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Profile ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "profile-uuid-...",
    "name": "TLS Server",
    "description": "Standard TLS server certificate",
    "certType": "server",
    "allowedKeyAlgorithms": ["rsa", "ecdsa"],
    "minKeySize": 2048,
    "keyUsage": ["digitalSignature", "keyEncipherment"],
    "extKeyUsage": ["serverAuth"],
    "basicConstraints": null,
    "maxValidityDays": 365,
    "subjectConstraints": null,
    "sanConstraints": null,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `profiles.read` permission |
| 404 | Not found | Profile does not exist |

---

### PATCH /profiles/:id

Update a certificate profile. All fields are optional.

**Authentication**: Required
**Permission**: `profiles.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Profile ID |
| name | body | string | No | Profile name |
| description | body | string | No | Description |
| certType | body | string | No | Certificate type |
| allowedKeyAlgorithms | body | string[] | No | Allowed algorithms |
| minKeySize | body | integer | No | Minimum key size |
| keyUsage | body | string[] | No | Key usage extensions |
| extKeyUsage | body | string[] | No | Extended key usage |
| basicConstraints | body | object / null | No | Basic constraints |
| maxValidityDays | body | integer | No | Max validity days |
| subjectConstraints | body | object / null | No | Subject constraints |
| sanConstraints | body | object / null | No | SAN constraints |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "profile-uuid-...",
    "name": "Updated TLS Server",
    "maxValidityDays": 730
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid field values |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `profiles.update` permission |
| 404 | Not found | Profile does not exist |

---

### DELETE /profiles/:id

Delete a certificate profile.

**Authentication**: Required
**Permission**: `profiles.delete`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Profile ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Profile deleted"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `profiles.delete` permission |
| 404 | Not found | Profile does not exist |

---

## Certificate Operations (`/certificates`)

### POST /certificates/issue

Issue a new certificate signed by a specified CA.

**Authentication**: Required
**Permission**: `certificates.issue`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| caId | body | string (UUID) | Yes | -- | Issuing CA ID |
| caPassphrase | body | string | Yes | -- | CA private key passphrase |
| profileId | body | string (UUID) | No | -- | Certificate profile to apply |
| commonName | body | string | Yes | -- | Subject common name (1-255 chars) |
| organization | body | string | No | -- | Organization (max 255 chars) |
| organizationalUnit | body | string | No | -- | Organizational unit (max 255 chars) |
| country | body | string | No | -- | Two-letter country code |
| state | body | string | No | -- | State or province (max 128 chars) |
| locality | body | string | No | -- | City (max 128 chars) |
| sans | body | object[] | No | -- | Subject Alternative Names (see below) |
| keyAlgorithm | body | string | No | `rsa` | Key algorithm: `rsa` or `ecdsa` |
| keySize | body | integer | No | -- | RSA key size (2048-4096) |
| keyCurve | body | string | No | -- | ECDSA curve name |
| validityDays | body | integer | No | 365 | Validity period (1-36500 days) |

**SAN Object Format**:

```json
{
  "type": "dns",
  "value": "example.com"
}
```

SAN types: `dns`, `ip`, `email`, `uri`

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "id": "cert-uuid-...",
    "caId": "ca-uuid-...",
    "commonName": "api.example.com",
    "serialNumber": "A1B2C3...",
    "status": "active",
    "certType": "server",
    "notBefore": "2025-06-01T00:00:00.000Z",
    "notAfter": "2026-06-01T00:00:00.000Z",
    "certificatePem": "-----BEGIN CERTIFICATE-----\n...",
    "privateKeyPem": "-----BEGIN PRIVATE KEY-----\n...",
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

Note: The private key is only returned at issuance time and is not stored on the server.

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Missing required fields or invalid parameters |
| 400 | Invalid CA passphrase | CA passphrase is incorrect |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `certificates.issue` permission |
| 404 | CA not found | The specified CA does not exist |

---

### GET /certificates

List certificates with filtering and pagination.

**Authentication**: Required
**Permission**: `certificates.read`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| page | query | integer | No | 1 | Page number |
| limit | query | integer | No | 20 | Items per page (max 100) |
| caId | query | string (UUID) | No | -- | Filter by issuing CA |
| status | query | string | No | -- | Filter: `active`, `revoked`, `expired`, `suspended` |
| certType | query | string | No | -- | Filter: `server`, `client`, `user`, `ca`, `smime` |
| search | query | string | No | -- | Search by common name (max 255 chars) |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "cert-uuid-...",
      "caId": "ca-uuid-...",
      "commonName": "api.example.com",
      "serialNumber": "A1B2C3...",
      "status": "active",
      "certType": "server",
      "notBefore": "2025-06-01T00:00:00.000Z",
      "notAfter": "2026-06-01T00:00:00.000Z",
      "createdAt": "2025-06-01T14:22:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `certificates.read` permission |

---

### GET /certificates/:id

Get detailed information about a specific certificate.

**Authentication**: Required
**Permission**: `certificates.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Certificate ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "cert-uuid-...",
    "caId": "ca-uuid-...",
    "commonName": "api.example.com",
    "subjectDn": "CN=api.example.com, O=Example Corp",
    "serialNumber": "A1B2C3...",
    "status": "active",
    "certType": "server",
    "keyAlgorithm": "rsa",
    "keySize": 2048,
    "sans": [
      {"type": "dns", "value": "api.example.com"},
      {"type": "dns", "value": "*.api.example.com"}
    ],
    "notBefore": "2025-06-01T00:00:00.000Z",
    "notAfter": "2026-06-01T00:00:00.000Z",
    "certificatePem": "-----BEGIN CERTIFICATE-----\n...",
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `certificates.read` permission |
| 404 | Not found | Certificate does not exist |

---

### GET /certificates/:id/download

Download a certificate in the specified format.

**Authentication**: Required
**Permission**: `certificates.download`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| id | path | string (UUID) | Yes | -- | Certificate ID |
| format | query | string | No | `pem` | Format: `pem`, `der`, `pkcs12` |
| password | query | string | Conditional | -- | Required for `pkcs12` format |
| includeChain | query | string | No | `"false"` | Include CA chain: `"true"` or `"false"` |

**Success (200)**:

Response content type varies by format:
- `pem`: `application/x-pem-file`
- `der`: `application/x-x509-ca-cert`
- `pkcs12`: `application/x-pkcs12`

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Password required for PKCS#12 | Format is `pkcs12` but no password provided |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `certificates.download` permission |
| 404 | Not found | Certificate does not exist |

---

### GET /certificates/:id/chain

Get the certificate chain from the certificate up to the root CA.

**Authentication**: Required
**Permission**: `certificates.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Certificate ID |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "commonName": "api.example.com",
      "certificatePem": "-----BEGIN CERTIFICATE-----\n..."
    },
    {
      "commonName": "Intermediate CA",
      "certificatePem": "-----BEGIN CERTIFICATE-----\n..."
    },
    {
      "commonName": "Root CA",
      "certificatePem": "-----BEGIN CERTIFICATE-----\n..."
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `certificates.read` permission |
| 404 | Not found | Certificate does not exist |

---

### POST /certificates/:id/revoke

Revoke a certificate. The revocation will be reflected in the next CRL generated for the issuing CA.

**Authentication**: Required
**Permission**: `certificates.revoke`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| id | path | string (UUID) | Yes | -- | Certificate ID |
| reason | body | string | No | `unspecified` | Revocation reason (see below) |
| invalidityDate | body | string (datetime) | No | -- | Date the key was known/suspected compromised |

**Revocation Reasons**: `unspecified`, `keyCompromise`, `caCompromise`, `affiliationChanged`, `superseded`, `cessationOfOperation`, `certificateHold`, `removeFromCRL`, `privilegeWithdrawn`, `aACompromise`

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "cert-uuid-...",
    "status": "revoked",
    "revocationReason": "keyCompromise",
    "revokedAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Already revoked | Certificate is already revoked |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `certificates.revoke` permission |
| 404 | Not found | Certificate does not exist |

---

### POST /certificates/:id/renew

Renew an existing certificate with a new validity period, keeping the same key and subject information.

**Authentication**: Required
**Permission**: `certificates.renew`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| id | path | string (UUID) | Yes | -- | Certificate ID |
| caPassphrase | body | string | Yes | -- | CA private key passphrase |
| validityDays | body | integer | No | -- | New validity period (1-36500 days) |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "new-cert-uuid-...",
    "commonName": "api.example.com",
    "status": "active",
    "notBefore": "2025-06-01T00:00:00.000Z",
    "notAfter": "2026-06-01T00:00:00.000Z",
    "certificatePem": "-----BEGIN CERTIFICATE-----\n...",
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid CA passphrase | CA passphrase is incorrect |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `certificates.renew` permission |
| 404 | Not found | Certificate does not exist |

---

## Certificate Signing Requests (`/certificates/requests`)

The CSR workflow enables a request-approve pattern for certificate issuance.

### POST /certificates/requests

Submit a Certificate Signing Request for approval.

**Authentication**: Required
**Permission**: `csr.submit`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| csrPem | body | string | Yes | PEM-encoded CSR |
| targetCaId | body | string (UUID) | Yes | Target CA to issue the certificate |
| profileId | body | string (UUID) | No | Certificate profile to apply |

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "id": "csr-uuid-...",
    "status": "pending",
    "commonName": "api.example.com",
    "targetCaId": "ca-uuid-...",
    "submittedBy": "a1b2c3d4-...",
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid CSR PEM or missing fields |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `csr.submit` permission |

---

### GET /certificates/requests

List CSRs with filtering and pagination.

**Authentication**: Required
**Permission**: `csr.read`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| page | query | integer | No | 1 | Page number |
| limit | query | integer | No | 20 | Items per page (max 100) |
| status | query | string | No | -- | Filter: `pending`, `approved`, `rejected` |
| targetCaId | query | string (UUID) | No | -- | Filter by target CA |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "csr-uuid-...",
      "status": "pending",
      "commonName": "api.example.com",
      "targetCaId": "ca-uuid-...",
      "submittedBy": "a1b2c3d4-...",
      "createdAt": "2025-06-01T14:22:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `csr.read` permission |

---

### GET /certificates/requests/:id

Get a specific CSR by ID.

**Authentication**: Required
**Permission**: `csr.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CSR ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "csr-uuid-...",
    "status": "pending",
    "commonName": "api.example.com",
    "subjectDn": "CN=api.example.com, O=Example Corp",
    "targetCaId": "ca-uuid-...",
    "profileId": "profile-uuid-...",
    "csrPem": "-----BEGIN CERTIFICATE REQUEST-----\n...",
    "submittedBy": "a1b2c3d4-...",
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `csr.read` permission |
| 404 | Not found | CSR does not exist |

---

### POST /certificates/requests/:id/approve

Approve a pending CSR and issue the certificate.

**Authentication**: Required
**Permission**: `csr.approve`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| id | path | string (UUID) | Yes | -- | CSR ID |
| caPassphrase | body | string | Yes | -- | CA private key passphrase |
| validityDays | body | integer | No | -- | Validity period (1-36500 days) |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "csr-uuid-...",
    "status": "approved",
    "certificateId": "cert-uuid-...",
    "approvedBy": "admin-uuid-...",
    "approvedAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid CA passphrase | CA passphrase is incorrect |
| 400 | CSR not pending | CSR has already been approved or rejected |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `csr.approve` permission |
| 404 | Not found | CSR does not exist |

---

### POST /certificates/requests/:id/reject

Reject a pending CSR with a reason.

**Authentication**: Required
**Permission**: `csr.approve`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | CSR ID |
| reason | body | string | Yes | Rejection reason (1-1000 chars) |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "csr-uuid-...",
    "status": "rejected",
    "rejectionReason": "Domain ownership not verified",
    "rejectedBy": "admin-uuid-...",
    "rejectedAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | CSR not pending | CSR has already been approved or rejected |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `csr.approve` permission |
| 404 | Not found | CSR does not exist |

---

## Certificate Login (`/cert-login`, `/cert-attach`, `/cert-status`, `/cert-binding`)

These endpoints are mounted at the API root (not under a resource prefix). See the [Authentication Guide](../authentication.md) for the full mTLS flow.

### POST /cert-login

Log in using a client certificate presented via mTLS. NGINX terminates TLS and forwards certificate details as HTTP headers. No request body is required.

**Authentication**: None (uses client certificate via `x-ssl-*` headers)

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "user@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | No client certificate | No certificate detected in headers |
| 401 | Certificate not bound | Certificate fingerprint not linked to any account |
| 401 | Account inactive | The bound user account is deactivated |

---

### POST /cert-attach

Attach a client certificate to a user account using a one-time code. The client must present a valid certificate via mTLS.

**Authentication**: None (uses client certificate via `x-ssl-*` headers + one-time code)

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| code | body | string (UUID) | Yes | One-time attach code from `/cert-attach/code` |
| label | body | string | No | Optional label for the binding (max 255 chars) |

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "id": "binding-uuid-...",
    "fingerprint": "SHA256:abc123...",
    "label": "Work Laptop",
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid or expired code | Attach code is invalid or has expired (15-minute lifetime) |
| 401 | No client certificate | No certificate detected in headers |
| 409 | Certificate already bound | This certificate is already linked to an account |

---

### POST /cert-attach/code

Generate a one-time code for attaching a client certificate. The code is valid for 15 minutes.

**Authentication**: Required (Bearer token)
**Rate Limit**: 5 codes per hour

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "code": "uuid-code-...",
    "expiresAt": "2025-06-01T14:37:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 429 | Rate limit exceeded | Too many codes generated recently |

---

### GET /cert-status

Get all certificate bindings for the currently authenticated user.

**Authentication**: Required (Bearer token)

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "binding-uuid-...",
      "fingerprint": "SHA256:abc123...",
      "subjectDn": "CN=User Cert",
      "label": "Work Laptop",
      "lastUsedAt": "2025-06-01T14:22:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### DELETE /cert-binding/:id

Remove a certificate binding from the authenticated user's account.

**Authentication**: Required (Bearer token)

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Binding ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Certificate binding removed"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not found | Binding does not exist or belongs to another user |
