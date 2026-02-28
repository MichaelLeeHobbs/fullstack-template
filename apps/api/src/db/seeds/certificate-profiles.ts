// ===========================================
// Built-in Certificate Profiles
// ===========================================
// Default certificate profiles seeded on first run.
// Built-in profiles (isBuiltIn=true) cannot be deleted.

import { certificateProfiles, type NewCertificateProfile } from '../schema/index.js';
import logger from '../../lib/logger.js';

type Tx = Parameters<Parameters<(typeof import('../../lib/db.js'))['db']['transaction']>[0]>[0];

export const builtInProfiles: NewCertificateProfile[] = [
  {
    name: 'TLS Server',
    description: 'Standard TLS server certificate for HTTPS endpoints',
    certType: 'server',
    allowedKeyAlgorithms: ['rsa', 'ecdsa'],
    minKeySize: 2048,
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extKeyUsage: ['serverAuth'],
    basicConstraints: null,
    maxValidityDays: 398, // Browser CA/B Forum max
    isBuiltIn: true,
  },
  {
    name: 'Client Authentication',
    description: 'Client certificate for mTLS authentication',
    certType: 'client',
    allowedKeyAlgorithms: ['rsa', 'ecdsa'],
    minKeySize: 2048,
    keyUsage: ['digitalSignature'],
    extKeyUsage: ['clientAuth'],
    basicConstraints: null,
    maxValidityDays: 365,
    isBuiltIn: true,
  },
  {
    name: 'User Authentication',
    description: 'User certificate for login via certificate-based authentication',
    certType: 'user',
    allowedKeyAlgorithms: ['rsa', 'ecdsa'],
    minKeySize: 2048,
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extKeyUsage: ['clientAuth', 'emailProtection'],
    basicConstraints: null,
    maxValidityDays: 365,
    isBuiltIn: true,
  },
  {
    name: 'Intermediate CA',
    description: 'Certificate profile for intermediate certificate authorities',
    certType: 'ca',
    allowedKeyAlgorithms: ['rsa', 'ecdsa'],
    minKeySize: 2048,
    keyUsage: ['keyCertSign', 'cRLSign'],
    extKeyUsage: [],
    basicConstraints: { ca: true, pathLenConstraint: 0 },
    maxValidityDays: 3650,
    isBuiltIn: true,
  },
  {
    name: 'S/MIME Email',
    description: 'Certificate for email signing and encryption',
    certType: 'smime',
    allowedKeyAlgorithms: ['rsa', 'ecdsa'],
    minKeySize: 2048,
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extKeyUsage: ['emailProtection'],
    basicConstraints: null,
    maxValidityDays: 365,
    isBuiltIn: true,
  },
];

export async function seedCertificateProfiles(tx: Tx): Promise<void> {
  logger.info('Seeding certificate profiles...');

  let seeded = 0;
  let skipped = 0;

  for (const profile of builtInProfiles) {
    const result = await tx
      .insert(certificateProfiles)
      .values(profile)
      .onConflictDoNothing({ target: certificateProfiles.name })
      .returning({ name: certificateProfiles.name });

    if (result.length > 0) {
      seeded++;
      logger.debug(`Seeded profile: ${profile.name}`);
    } else {
      skipped++;
      logger.debug(`Skipped (exists): ${profile.name}`);
    }
  }

  logger.info(`Certificate profiles: ${seeded} added, ${skipped} skipped`);
}
