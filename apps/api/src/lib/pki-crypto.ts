// ===========================================
// PKI Crypto Library
// ===========================================
// X.509 certificate operations using node-forge and argon2.
// Provides key pair generation, certificate signing, CSR handling,
// private key encryption, CRL generation, and PKCS#12 export.

import forge from 'node-forge';
import argon2 from 'argon2';
import { randomBytes, createCipheriv, createDecipheriv, createHash, generateKeyPairSync, createPublicKey, createPrivateKey } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyPairResult {
  publicKeyPem: string;
  privateKeyPem: string;
  fingerprint: string;
}

export interface EncryptedKeyResult {
  encrypted: string; // base64
  salt: string; // hex
  iv: string; // hex
  tag: string; // hex
}

export interface SubjectFields {
  commonName: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
}

export interface CertificateExtensions {
  keyUsage?: string[];
  extKeyUsage?: string[];
  basicConstraints?: { cA: boolean; pathLenConstraint?: number };
  subjectAltNames?: { type: number; value: string }[]; // type 2=DNS, 6=URI, 7=IP
}

export interface ParsedCertificate {
  subject: SubjectFields;
  issuer: SubjectFields;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  fingerprint: string;
  extensions: Record<string, unknown>;
  pem: string;
}

export interface ParsedCSR {
  subject: SubjectFields;
  publicKeyPem: string;
  extensions: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

const CURVE_MAP: Record<string, string> = {
  'P-256': 'prime256v1',
  'P-384': 'secp384r1',
};

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function subjectToAttributes(subject: SubjectFields): forge.pki.CertificateField[] {
  const attrs: forge.pki.CertificateField[] = [
    { shortName: 'CN', value: subject.commonName },
  ];
  if (subject.organization) attrs.push({ shortName: 'O', value: subject.organization });
  if (subject.organizationalUnit) attrs.push({ shortName: 'OU', value: subject.organizationalUnit });
  if (subject.country) attrs.push({ shortName: 'C', value: subject.country });
  if (subject.state) attrs.push({ shortName: 'ST', value: subject.state });
  if (subject.locality) attrs.push({ shortName: 'L', value: subject.locality });
  return attrs;
}

function attributesToSubject(attrs: forge.pki.CertificateField[]): SubjectFields {
  const get = (name: string): string | undefined => {
    const attr = attrs.find((a) => a.shortName === name || a.name === name);
    return attr?.value as string | undefined;
  };

  return {
    commonName: get('CN') ?? get('commonName') ?? '',
    organization: get('O') ?? get('organizationName'),
    organizationalUnit: get('OU') ?? get('organizationalUnitName'),
    country: get('C') ?? get('countryName'),
    state: get('ST') ?? get('stateOrProvinceName'),
    locality: get('L') ?? get('localityName'),
  };
}

/**
 * Build the forge extensions array from our CertificateExtensions interface.
 */
function buildExtensions(ext: CertificateExtensions): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  if (ext.basicConstraints) {
    result.push({
      name: 'basicConstraints',
      cA: ext.basicConstraints.cA,
      ...(ext.basicConstraints.pathLenConstraint !== undefined && {
        pathLenConstraint: ext.basicConstraints.pathLenConstraint,
      }),
      critical: true,
    });
  }

  if (ext.keyUsage && ext.keyUsage.length > 0) {
    const usage: Record<string, boolean> = {};
    for (const u of ext.keyUsage) {
      usage[u] = true;
    }
    result.push({
      name: 'keyUsage',
      critical: true,
      ...usage,
    });
  }

  if (ext.extKeyUsage && ext.extKeyUsage.length > 0) {
    const usage: Record<string, boolean> = {};
    for (const u of ext.extKeyUsage) {
      usage[u] = true;
    }
    result.push({
      name: 'extKeyUsage',
      ...usage,
    });
  }

  if (ext.subjectAltNames && ext.subjectAltNames.length > 0) {
    result.push({
      name: 'subjectAltName',
      altNames: ext.subjectAltNames,
    });
  }

  return result;
}

/**
 * Derive a 32-byte encryption key from a passphrase using argon2id.
 */
async function deriveKey(passphrase: string, salt: Buffer): Promise<Buffer> {
  return argon2.hash(passphrase, {
    type: argon2.argon2id,
    raw: true,
    hashLength: 32,
    salt,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a key pair (RSA or ECDSA).
 *
 * RSA uses node-forge; ECDSA uses Node.js built-in crypto since node-forge
 * has limited EC support.
 */
export async function generateKeyPair(
  algorithm: 'rsa' | 'ecdsa',
  keySize?: number,
  curve?: string,
): Promise<KeyPairResult> {
  if (algorithm === 'rsa') {
    // node-forge RSA generation is synchronous and can be slow — wrap in Promise
    const keyPair = await new Promise<forge.pki.rsa.KeyPair>((resolve, reject) => {
      try {
        const pair = forge.pki.rsa.generateKeyPair({ bits: keySize ?? 2048 });
        resolve(pair);
      } catch (err) {
        reject(err);
      }
    });

    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const fingerprint = computeFingerprint(publicKeyPem);

    return { publicKeyPem, privateKeyPem, fingerprint };
  }

  // ECDSA — use Node.js crypto
  const namedCurve = CURVE_MAP[curve ?? 'P-256'] ?? curve ?? 'prime256v1';

  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const fingerprint = computeFingerprint(publicKey);

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    fingerprint,
  };
}

/**
 * Encrypt a PEM-encoded private key using AES-256-GCM with an argon2id-derived key.
 */
export async function encryptPrivateKey(
  pem: string,
  passphrase: string,
): Promise<EncryptedKeyResult> {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = await deriveKey(passphrase, salt);

  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(pem, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt a PEM-encoded private key previously encrypted with `encryptPrivateKey`.
 */
export async function decryptPrivateKey(
  encrypted: string,
  passphrase: string,
  salt: string,
  iv: string,
  tag: string,
): Promise<string> {
  const key = await deriveKey(passphrase, Buffer.from(salt, 'hex'));

  const decipher = createDecipheriv(AES_ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Verify that a passphrase can decrypt a private key and that the resulting
 * key matches an expected fingerprint. Returns false on any error.
 */
export async function verifyPassphrase(
  encrypted: string,
  passphrase: string,
  salt: string,
  iv: string,
  tag: string,
  expectedFingerprint: string,
): Promise<boolean> {
  try {
    const pem = await decryptPrivateKey(encrypted, passphrase, salt, iv, tag);

    // Determine whether this is RSA or EC and get the public key PEM
    let publicKeyPem: string;
    try {
      // Try RSA first
      const privateKey = forge.pki.privateKeyFromPem(pem);
      const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
      publicKeyPem = forge.pki.publicKeyToPem(publicKey);
    } catch {
      // Assume ECDSA — the PEM itself is the private key; derive public key via Node crypto
      const privKeyObj = createPrivateKey(pem);
      const pubKeyObj = createPublicKey(privKeyObj);
      publicKeyPem = pubKeyObj.export({ type: 'spki', format: 'pem' }) as string;
    }

    const fingerprint = computeFingerprint(publicKeyPem);
    return fingerprint === expectedFingerprint;
  } catch {
    return false;
  }
}

/**
 * Compute a SHA-256 fingerprint of a public key.
 *
 * Returns hex with colon separators (e.g. "AB:CD:EF:...").
 */
export function computeFingerprint(publicKeyPem: string): string {
  let derBytes: Buffer;

  try {
    // Try parsing as a forge RSA public key
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const asn1 = forge.pki.publicKeyToAsn1(publicKey);
    const derBuffer = forge.asn1.toDer(asn1);
    derBytes = Buffer.from(derBuffer.getBytes(), 'binary');
  } catch {
    // Fallback for ECDSA / other keys — use Node crypto to get DER
    const pubKey = createPublicKey(publicKeyPem);
    derBytes = pubKey.export({ type: 'spki', format: 'der' }) as Buffer;
  }

  const hash = createHash('sha256').update(derBytes).digest('hex');

  // Insert colons every 2 characters and uppercase
  return hash
    .toUpperCase()
    .match(/.{2}/g)!
    .join(':');
}

/**
 * Create a self-signed X.509 certificate.
 */
export function createSelfSignedCert(
  keyPem: string,
  subject: SubjectFields,
  serial: string,
  notBefore: Date,
  notAfter: Date,
  extensions: CertificateExtensions,
): string {
  const privateKey = forge.pki.privateKeyFromPem(keyPem);
  const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);

  const cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = serial;
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  const attrs = subjectToAttributes(subject);
  cert.setSubject(attrs);
  cert.setIssuer(attrs); // self-signed: issuer === subject

  const exts = buildExtensions(extensions);

  // Add Subject Key Identifier
  exts.push({
    name: 'subjectKeyIdentifier',
  });

  // Add Authority Key Identifier (points to self for self-signed)
  exts.push({
    name: 'authorityKeyIdentifier',
    keyIdentifier: true,
  });

  cert.setExtensions(exts as unknown[]);

  cert.sign(privateKey, forge.md.sha256.create());

  return forge.pki.certificateToPem(cert);
}

/**
 * Sign a certificate from a CSR using a CA certificate and key.
 */
export function signCertificate(
  caCertPem: string,
  caKeyPem: string,
  csrPem: string,
  serial: string,
  profile: CertificateExtensions,
  notBefore: Date,
  notAfter: Date,
): string {
  const caCert = forge.pki.certificateFromPem(caCertPem);
  const caKey = forge.pki.privateKeyFromPem(caKeyPem);
  const csr = forge.pki.certificationRequestFromPem(csrPem);

  // Validate CSR signature
  if (!csr.verify()) {
    throw new Error('CSR signature verification failed');
  }

  const cert = forge.pki.createCertificate();
  cert.publicKey = csr.publicKey as forge.pki.rsa.PublicKey;
  cert.serialNumber = serial;
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  // Subject from CSR, issuer from CA
  cert.setSubject(csr.subject.attributes);
  cert.setIssuer(caCert.subject.attributes);

  const exts = buildExtensions(profile);

  // Add Subject Key Identifier (from subject public key)
  exts.push({
    name: 'subjectKeyIdentifier',
  });

  // Add Authority Key Identifier (from CA cert)
  exts.push({
    name: 'authorityKeyIdentifier',
    keyIdentifier: true,
    authorityCertIssuer: true,
    serialNumber: caCert.serialNumber,
  });

  cert.setExtensions(exts as unknown[]);

  cert.sign(caKey, forge.md.sha256.create());

  return forge.pki.certificateToPem(cert);
}

/**
 * Generate a Certificate Signing Request (CSR).
 */
export function generateCSR(
  keyPem: string,
  subject: SubjectFields,
  extensions?: CertificateExtensions,
): string {
  const privateKey = forge.pki.privateKeyFromPem(keyPem);
  const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);

  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = publicKey;
  csr.setSubject(subjectToAttributes(subject));

  if (extensions) {
    const exts = buildExtensions(extensions);
    if (exts.length > 0) {
      csr.setAttributes([
        {
          name: 'extensionRequest',
          extensions: exts as unknown[],
        },
      ]);
    }
  }

  csr.sign(privateKey, forge.md.sha256.create());

  return forge.pki.certificationRequestToPem(csr);
}

/**
 * Parse a PEM-encoded X.509 certificate and extract its fields.
 */
export function parseCertificate(pem: string): ParsedCertificate {
  const cert = forge.pki.certificateFromPem(pem);

  // Collect extensions into a record
  const extensions: Record<string, unknown> = {};
  if (cert.extensions) {
    for (const ext of cert.extensions) {
      extensions[ext.name || ext.id] = ext;
    }
  }

  // Compute fingerprint of the public key
  const publicKeyPem = forge.pki.publicKeyToPem(cert.publicKey as forge.pki.rsa.PublicKey);
  const fingerprint = computeFingerprint(publicKeyPem);

  return {
    subject: attributesToSubject(cert.subject.attributes),
    issuer: attributesToSubject(cert.issuer.attributes),
    serialNumber: cert.serialNumber,
    notBefore: cert.validity.notBefore,
    notAfter: cert.validity.notAfter,
    fingerprint,
    extensions,
    pem,
  };
}

/**
 * Parse a PEM-encoded Certificate Signing Request.
 */
export function parseCSR(pem: string): ParsedCSR {
  const csr = forge.pki.certificationRequestFromPem(pem);

  // Collect extensions from CSR attributes
  const extensions: Record<string, unknown> = {};
  if (csr.attributes) {
    for (const attr of csr.attributes) {
      if (attr.name === 'extensionRequest' && attr.extensions) {
        for (const ext of attr.extensions) {
          extensions[ext.name || ext.id] = ext;
        }
      }
    }
  }

  const publicKeyPem = forge.pki.publicKeyToPem(csr.publicKey as forge.pki.rsa.PublicKey);

  return {
    subject: attributesToSubject(csr.subject.attributes),
    publicKeyPem,
    extensions,
  };
}

/**
 * Verify a certificate against a chain of CA certificates.
 */
export function verifyChain(certPem: string, chainPems: string[]): boolean {
  try {
    const caStore = forge.pki.createCaStore(chainPems);
    const cert = forge.pki.certificateFromPem(certPem);
    return forge.pki.verifyCertificateChain(caStore, [cert]);
  } catch {
    return false;
  }
}

/**
 * Sign a Certificate Revocation List (CRL).
 *
 * node-forge does not provide a high-level CRL API, so this builds the
 * ASN.1 structure manually following RFC 5280 Section 5.
 */
export function signCRL(
  caCertPem: string,
  caKeyPem: string,
  revokedEntries: { serial: string; date: Date; reason?: string }[],
  crlNumber: number,
  thisUpdate: Date,
  nextUpdate: Date,
): string {
  const caCert = forge.pki.certificateFromPem(caCertPem);
  const caKey = forge.pki.privateKeyFromPem(caKeyPem);

  // Map CRL reason strings to their RFC 5280 enum values
  const CRL_REASONS: Record<string, number> = {
    unspecified: 0,
    keyCompromise: 1,
    cACompromise: 2,
    affiliationChanged: 3,
    superseded: 4,
    cessationOfOperation: 5,
    certificateHold: 6,
    removeFromCRL: 8,
    privilegeWithdrawn: 9,
    aACompromise: 10,
  } as const;

  // Build revoked certificate entries
  const revokedCertSequences = revokedEntries.map((entry) => {
    const serialBytes = forge.util.hexToBytes(entry.serial);
    const serialInt = forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.INTEGER,
      false,
      serialBytes,
    );

    const revocationDate = forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.UTCTIME,
      false,
      forge.asn1.dateToUtcTime(entry.date),
    );

    const entryValues: forge.asn1.Asn1[] = [serialInt, revocationDate];

    // Add CRL reason extension if specified
    const reasonValue = entry.reason ? CRL_REASONS[entry.reason] : undefined;
    if (reasonValue !== undefined) {
      const reasonCode = forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.ENUMERATED,
        false,
        String.fromCharCode(reasonValue),
      );

      const reasonExtension = forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          // OID for CRL Reason: 2.5.29.21
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer('2.5.29.21').getBytes(),
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OCTETSTRING,
            false,
            forge.asn1.toDer(reasonCode).getBytes(),
          ),
        ],
      );

      const crlEntryExtensions = forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [reasonExtension],
      );

      entryValues.push(crlEntryExtensions);
    }

    return forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.SEQUENCE,
      true,
      entryValues,
    );
  });

  // Build TBSCertList
  const tbsValues: forge.asn1.Asn1[] = [];

  // Version v2 (integer 1)
  tbsValues.push(
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.INTEGER,
      false,
      String.fromCharCode(1),
    ),
  );

  // Signature algorithm: sha256WithRSAEncryption (1.2.840.113549.1.1.11)
  tbsValues.push(
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OID,
        false,
        forge.asn1.oidToDer('1.2.840.113549.1.1.11').getBytes(),
      ),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
    ]),
  );

  // Issuer (reuse from CA certificate ASN.1)
  const issuerAsn1 = forge.pki.distinguishedNameToAsn1(caCert.subject);
  tbsValues.push(issuerAsn1);

  // thisUpdate
  tbsValues.push(
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.UTCTIME,
      false,
      forge.asn1.dateToUtcTime(thisUpdate),
    ),
  );

  // nextUpdate
  tbsValues.push(
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.UTCTIME,
      false,
      forge.asn1.dateToUtcTime(nextUpdate),
    ),
  );

  // Revoked certificates sequence (only if there are entries)
  if (revokedCertSequences.length > 0) {
    tbsValues.push(
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        revokedCertSequences,
      ),
    );
  }

  // CRL Extensions (explicit tag [0])
  const crlNumberBytes = forge.util.hexToBytes(crlNumber.toString(16).padStart(2, '0'));
  const crlExtensions = forge.asn1.create(
    forge.asn1.Class.CONTEXT_SPECIFIC,
    0,
    true,
    [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        // CRL Number extension (2.5.29.20)
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer('2.5.29.20').getBytes(),
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OCTETSTRING,
            false,
            forge.asn1.toDer(
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.INTEGER,
                false,
                crlNumberBytes,
              ),
            ).getBytes(),
          ),
        ]),
        // Authority Key Identifier extension (2.5.29.35)
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer('2.5.29.35').getBytes(),
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OCTETSTRING,
            false,
            forge.asn1.toDer(
              forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
                forge.asn1.create(
                  forge.asn1.Class.CONTEXT_SPECIFIC,
                  0,
                  false,
                  forge.asn1.toDer(
                    forge.pki.publicKeyToAsn1(caCert.publicKey as forge.pki.rsa.PublicKey),
                  ).getBytes(),
                ),
              ]),
            ).getBytes(),
          ),
        ]),
      ]),
    ],
  );
  tbsValues.push(crlExtensions);

  const tbsCertList = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    tbsValues,
  );

  // Sign the TBSCertList
  const tbsDer = forge.asn1.toDer(tbsCertList);
  const md = forge.md.sha256.create();
  md.update(tbsDer.getBytes());
  const signature = caKey.sign(md);

  // Build complete CRL
  const crl = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    tbsCertList,
    // Signature algorithm
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OID,
        false,
        forge.asn1.oidToDer('1.2.840.113549.1.1.11').getBytes(),
      ),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
    ]),
    // Signature value (BIT STRING with leading 0x00 for unused bits)
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.BITSTRING,
      false,
      String.fromCharCode(0x00) + signature,
    ),
  ]);

  const crlDer = forge.asn1.toDer(crl);
  const crlBase64 = forge.util.encode64(crlDer.getBytes(), 64);

  return `-----BEGIN X509 CRL-----\r\n${crlBase64}\r\n-----END X509 CRL-----\r\n`;
}

/**
 * Export a certificate, private key, and optional chain as a PKCS#12 (.p12) bundle.
 */
export function exportPKCS12(
  certPem: string,
  keyPem: string,
  chainPems: string[],
  password: string,
): Buffer {
  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);
  const chain = chainPems.map((p) => forge.pki.certificateFromPem(p));

  const allCerts = [cert, ...chain];

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(key, allCerts, password, {
    algorithm: '3des',
  });

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, 'binary');
}
