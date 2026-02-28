// ===========================================
// Client Certificate Extraction
// ===========================================
// Extracts client certificate info from NGINX-forwarded headers.
// NGINX terminates TLS and forwards cert details via x-ssl-* headers.

export interface ExtractedClientCert {
  authenticated: string; // 'SUCCESS', 'FAILED', 'NONE'
  dn: string;           // x-ssl-user-dn
  cn: string;           // x-ssl-cn
  serial: string;       // x-ssl-serial
  expiration: string;   // x-ssl-expiration
  fingerprint: string;  // x-ssl-fingerprint
}

export function extractClientCert(
  headers: Record<string, string | string[] | undefined>,
): ExtractedClientCert | null {
  const authenticated = headers['x-ssl-authenticated'] as string | undefined;
  if (!authenticated) return null;

  return {
    authenticated,
    dn: (headers['x-ssl-user-dn'] as string) ?? '',
    cn: (headers['x-ssl-cn'] as string) ?? '',
    serial: (headers['x-ssl-serial'] as string) ?? '',
    expiration: (headers['x-ssl-expiration'] as string) ?? '',
    fingerprint: (headers['x-ssl-fingerprint'] as string) ?? '',
  };
}
