// ===========================================
// JWT Utilities
// ===========================================

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface JwtPayload {
  userId: string;
  sessionId?: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}

// ===========================================
// MFA Temp Token (short-lived, 5 minutes)
// ===========================================

export interface MfaTempPayload {
  userId: string;
  purpose: 'mfa';
}

export function signMfaTempToken(payload: MfaTempPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '5m',
  });
}

export function verifyMfaTempToken(token: string): MfaTempPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET) as MfaTempPayload;
  if (decoded.purpose !== 'mfa') {
    throw new Error('Invalid MFA token');
  }
  return decoded;
}

