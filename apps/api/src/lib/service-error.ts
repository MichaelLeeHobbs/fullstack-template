// ===========================================
// Service Error
// ===========================================
// Typed error class for service-layer errors.
// Replaces ad-hoc string matching in controllers with structured error codes.

export const SERVICE_ERRORS = {
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  FORBIDDEN: 'FORBIDDEN',
  SYSTEM_PROTECTED: 'SYSTEM_PROTECTED',
  SELF_ACTION: 'SELF_ACTION',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // PKI
  CA_NOT_FOUND: 'CA_NOT_FOUND',
  CA_NOT_ACTIVE: 'CA_NOT_ACTIVE',
  CERT_NOT_FOUND: 'CERT_NOT_FOUND',
  CERT_ALREADY_REVOKED: 'CERT_ALREADY_REVOKED',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  PROFILE_CONSTRAINT_VIOLATION: 'PROFILE_CONSTRAINT_VIOLATION',
  HIERARCHY_VIOLATION: 'HIERARCHY_VIOLATION',
  INVALID_PASSPHRASE: 'INVALID_PASSPHRASE',
  CERT_NOT_DETECTED: 'CERT_NOT_DETECTED',
  CERT_NOT_AUTHENTICATED: 'CERT_NOT_AUTHENTICATED',
  CERT_NOT_BOUND: 'CERT_NOT_BOUND',
  ATTACH_CODE_INVALID: 'ATTACH_CODE_INVALID',
  ATTACH_CODE_EXPIRED: 'ATTACH_CODE_EXPIRED',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ServiceErrorCode = (typeof SERVICE_ERRORS)[keyof typeof SERVICE_ERRORS];

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Type guard to check if an error is a ServiceError, optionally matching a specific code.
 */
export function isServiceError(error: unknown, code?: ServiceErrorCode): error is ServiceError {
  if (!(error instanceof ServiceError)) return false;
  return code ? error.code === code : true;
}
