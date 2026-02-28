// ===========================================
// PKI Types
// ===========================================

// CA types
export interface CertificateAuthority {
  id: string;
  name: string;
  description: string | null;
  commonName: string;
  organization: string | null;
  organizationalUnit: string | null;
  country: string | null;
  state: string | null;
  locality: string | null;
  parentCaId: string | null;
  isRoot: boolean;
  pathLenConstraint: number | null;
  status: string;
  serialCounter: number;
  maxValidityDays: number;
  defaultValidityDays: number;
  crlDistributionUrl: string | null;
  ocspUrl: string | null;
  certificateId: string | null;
  privateKeyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaHierarchyNode extends CertificateAuthority {
  children?: CaHierarchyNode[];
}

export interface CreateCaInput {
  name: string;
  description?: string;
  commonName: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  parentCaId?: string;
  parentCaPassphrase?: string;
  passphrase: string;
  keyAlgorithm?: 'rsa' | 'ecdsa';
  keySize?: number;
  keyCurve?: string;
  validityDays?: number;
  maxValidityDays?: number;
  defaultValidityDays?: number;
  pathLenConstraint?: number;
  crlDistributionUrl?: string;
  ocspUrl?: string;
}

export interface UpdateCaInput {
  name?: string;
  description?: string;
  maxValidityDays?: number;
  defaultValidityDays?: number;
  crlDistributionUrl?: string;
  ocspUrl?: string;
}

// Certificate types
export interface Certificate {
  id: string;
  issuingCaId: string | null;
  serialNumber: string;
  commonName: string;
  organization: string | null;
  organizationalUnit: string | null;
  country: string | null;
  state: string | null;
  locality: string | null;
  sans: { type: string; value: string }[] | null;
  certificatePem: string;
  fingerprint: string;
  notBefore: string;
  notAfter: string;
  certType: string;
  status: string;
  profileId: string | null;
  privateKeyId: string | null;
  createdAt: string;
}

export interface IssueCertificateInput {
  caId: string;
  caPassphrase: string;
  profileId?: string;
  commonName: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  sans?: { type: 'dns' | 'ip' | 'email' | 'uri'; value: string }[];
  keyAlgorithm?: 'rsa' | 'ecdsa';
  keySize?: number;
  keyCurve?: string;
  validityDays?: number;
}

export interface IssueCertificateResponse {
  certificate: Certificate;
  privateKeyPem: string;
  certificatePem: string;
  chainPem: string;
}

export interface RevokeCertificateInput {
  reason?: string;
  invalidityDate?: string;
}

export interface RenewCertificateInput {
  caPassphrase: string;
  validityDays?: number;
}

// Certificate Profile types
export interface CertificateProfile {
  id: string;
  name: string;
  description: string | null;
  certType: string;
  allowedKeyAlgorithms: string[];
  minKeySize: number;
  keyUsage: string[];
  extKeyUsage: string[];
  basicConstraints: { ca: boolean; pathLenConstraint?: number } | null;
  maxValidityDays: number;
  subjectConstraints: Record<string, unknown> | null;
  sanConstraints: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileInput {
  name: string;
  description?: string;
  certType: 'server' | 'client' | 'user' | 'ca' | 'smime';
  allowedKeyAlgorithms?: ('rsa' | 'ecdsa')[];
  minKeySize?: number;
  keyUsage: string[];
  extKeyUsage?: string[];
  basicConstraints?: { ca: boolean; pathLenConstraint?: number } | null;
  maxValidityDays?: number;
  subjectConstraints?: Record<string, unknown> | null;
  sanConstraints?: Record<string, unknown> | null;
}

export type UpdateProfileInput = Partial<CreateProfileInput>;

// CSR types
export interface CertificateRequest {
  id: string;
  csrPem: string;
  commonName: string;
  subjectDn: string | null;
  sans: { type: string; value: string }[] | null;
  keyAlgorithm: string | null;
  keySize: number | null;
  targetCaId: string;
  profileId: string | null;
  status: string;
  certificateId: string | null;
  requestedBy: string;
  approvedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitCsrInput {
  csrPem: string;
  targetCaId: string;
  profileId?: string;
}

export interface ApproveCsrInput {
  caPassphrase: string;
  validityDays?: number;
}

export interface RejectCsrInput {
  reason: string;
}

// CRL types
export interface CRL {
  id: string;
  caId: string;
  crlNumber: number;
  crlPem: string;
  thisUpdate: string;
  nextUpdate: string;
  entriesCount: number;
  createdAt: string;
}

// Revocation types
export interface Revocation {
  id: string;
  certificateId: string;
  reason: string;
  revokedAt: string;
  invalidityDate: string | null;
  revokedBy: string;
}

// User Certificate types
export interface UserCertificate {
  id: string;
  userId: string;
  certificateDn: string;
  certificateCn: string;
  certificateSerial: string;
  certificateFingerprint: string;
  expiresAt: string;
  certificateId: string | null;
  status: string;
  label: string | null;
  createdAt: string;
}

// PKI Audit types
export interface PkiAuditLog {
  id: string;
  action: string;
  actorId: string | null;
  actorIp: string | null;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

// Cert Login types
export interface AttachCodeResponse {
  code: string;
  expiresAt: string;
}

export interface CertLoginResponse {
  user: { id: string; email: string };
  accessToken: string;
}
