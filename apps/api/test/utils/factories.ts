// ===========================================
// Test Data Factories
// ===========================================
// Each returns a complete record matching the Drizzle $inferSelect type.
// Pass overrides to customize individual fields.

import { randomUUID } from 'crypto';

interface TestUser {
  id: string;
  email: string;
  passwordHash: string | null;
  accountType: string;
  isAdmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  preferences: { theme: 'light' | 'dark' | 'system' };
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: randomUUID(),
    email: `user-${Date.now()}@example.com`,
    passwordHash: '$2b$12$hashedpassword',
    accountType: 'user',
    isAdmin: false,
    isActive: true,
    emailVerified: true,
    preferences: { theme: 'system' },
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

interface TestSession {
  id: string;
  userId: string;
  refreshToken: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export function createTestSession(overrides: Partial<TestSession> = {}): TestSession {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    id: randomUUID(),
    userId: randomUUID(),
    refreshToken: `refresh-${randomUUID()}`,
    userAgent: 'Mozilla/5.0 Test',
    ipAddress: '127.0.0.1',
    lastUsedAt: new Date(),
    expiresAt,
    createdAt: new Date(),
    ...overrides,
  };
}

interface TestRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestRole(overrides: Partial<TestRole> = {}): TestRole {
  return {
    id: randomUUID(),
    name: `role-${Date.now()}`,
    description: 'Test role',
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

interface TestPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: Date;
}

export function createTestPermission(overrides: Partial<TestPermission> = {}): TestPermission {
  return {
    id: randomUUID(),
    name: 'users:read',
    description: 'Read users',
    resource: 'users',
    action: 'read',
    createdAt: new Date(),
    ...overrides,
  };
}

interface TestApiKey {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  keyHash: string;
  expiresAt: Date | null;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestApiKey(overrides: Partial<TestApiKey> = {}): TestApiKey {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    name: 'Test API Key',
    prefix: 'fst_test',
    keyHash: 'a'.repeat(64),
    expiresAt: null,
    isActive: true,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
