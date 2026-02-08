// ===========================================
// Encryption Utilities
// ===========================================
// AES-256-GCM encryption for secrets at rest.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT = 'fullstack-template-totp-encryption'; // Static salt for deterministic key derivation

// Derive a 256-bit key from the configured encryption key
function getEncryptionKey(): Buffer {
  const source = config.ENCRYPTION_KEY ?? config.JWT_SECRET;
  return scryptSync(source, SALT, 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a combined string: base64(iv + ciphertext + authTag)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Combine iv + encrypted + tag into a single buffer
  const combined = Buffer.concat([iv, encrypted, tag]);
  return combined.toString('base64');
}

/**
 * Decrypt a string encrypted with encrypt().
 * Input is base64(iv + ciphertext + authTag).
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedData, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Check if a value looks like it's already encrypted (base64-encoded with correct structure).
 * Used during migration to detect plaintext TOTP secrets.
 */
export function isEncrypted(value: string): boolean {
  try {
    const buf = Buffer.from(value, 'base64');
    // Must be at least IV + TAG length, and re-encoding should match
    return buf.length >= IV_LENGTH + TAG_LENGTH && buf.toString('base64') === value;
  } catch {
    return false;
  }
}
