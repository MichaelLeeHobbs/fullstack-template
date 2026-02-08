// ===========================================
// API Key Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockTransaction = vi.fn(async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
    return cb({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete });
  });

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      transaction: mockTransaction,
    },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete, mockTransaction },
  };
});

// Mock PermissionService
vi.mock('./permission.service.js', () => ({
  PermissionService: {
    getUserPermissions: vi.fn().mockResolvedValue(new Set(['users:read', 'users:create'])),
  },
}));

// Mock logger
vi.mock('../lib/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { ApiKeyService } from './api-key.service.js';
import { db } from '../lib/db.js';
import { PermissionService } from './permission.service.js';

describe('ApiKeyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashKey', () => {
    it('should produce a consistent SHA-256 hex hash', () => {
      const hash1 = ApiKeyService.hashKey('fst_abc123');
      const hash2 = ApiKeyService.hashKey('fst_abc123');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = ApiKeyService.hashKey('fst_key1');
      const hash2 = ApiKeyService.hashKey('fst_key2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('create', () => {
    it('should create a key with no permissions for admin (simple path)', async () => {
      // Test the simplest create path: no permissions, so no permission validation queries

      // Mock transaction
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
        const insert = vi.fn(() => {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{
                id: 'key-1',
                userId: 'user-1',
                name: 'Test Key',
                prefix: 'fst_abcd',
                keyHash: 'hash123',
                expiresAt: null,
                isActive: true,
                lastUsedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }]),
            }),
          };
        });
        return cb({ insert, select: vi.fn(), update: vi.fn(), delete: vi.fn() });
      });

      // Mock getKeyPermissions (called after transaction via db.select)
      const mockInnerJoin = vi.fn();
      const mockPermWhere = vi.fn().mockResolvedValue([]);
      mockInnerJoin.mockReturnValue({ where: mockPermWhere });
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await ApiKeyService.create(
        { name: 'Test Key', permissionIds: [] },
        'creator-1',
        true // admin
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.rawKey).toMatch(/^fst_[a-f0-9]{64}$/);
        expect(result.value.apiKey.name).toBe('Test Key');
      }
    });

    it('should reject excess permissions for non-admin', async () => {
      // Mock: creator has users:read and users:create
      (PermissionService.getUserPermissions as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Set(['users:read'])
      );

      // Mock: requested permissions include one the creator doesn't have
      const mockFrom = vi.fn();
      const mockWhere = vi.fn();
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockResolvedValue([
        { id: 'perm-1', name: 'users:read' },
        { id: 'perm-2', name: 'users:delete' }, // creator doesn't have this
      ]);

      const result = await ApiKeyService.create(
        { name: 'Test Key', permissionIds: ['perm-1', 'perm-2'] },
        'creator-1',
        false // not admin
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Cannot assign permission');
      }
    });
  });

  describe('validateKey', () => {
    it('should validate an active key and return permissions', async () => {
      const rawKey = 'fst_abc123';

      // Track call count to db.select to differentiate the two queries
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: find key by hash
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{
                id: 'key-1',
                userId: 'user-1',
                name: 'Test Key',
                keyHash: ApiKeyService.hashKey(rawKey),
                isActive: true,
                expiresAt: null,
              }]),
            }),
          };
        }
        // Second call: find permissions via innerJoin
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ name: 'users:read' }]),
            }),
          }),
        };
      });

      // Mock: lastUsedAt update (fire-and-forget)
      const mockSet = vi.fn();
      const mockUpdateWhere = vi.fn();
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockUpdateWhere });
      mockUpdateWhere.mockReturnValue({ then: vi.fn().mockReturnValue({ catch: vi.fn() }) });

      const result = await ApiKeyService.validateKey(rawKey);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.userId).toBe('user-1');
        expect(result.value.permissions.has('users:read')).toBe(true);
        expect(result.value.apiKey.id).toBe('key-1');
      }
    });

    it('should reject a revoked key', async () => {
      const rawKey = 'fst_revoked';

      const mockFrom = vi.fn();
      const mockWhere = vi.fn();
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockResolvedValueOnce([{
        id: 'key-2',
        userId: 'user-1',
        name: 'Revoked Key',
        keyHash: ApiKeyService.hashKey(rawKey),
        isActive: false,
        expiresAt: null,
      }]);

      const result = await ApiKeyService.validateKey(rawKey);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('revoked');
      }
    });

    it('should reject an expired key', async () => {
      const rawKey = 'fst_expired';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockFrom = vi.fn();
      const mockWhere = vi.fn();
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockResolvedValueOnce([{
        id: 'key-3',
        userId: 'user-1',
        name: 'Expired Key',
        keyHash: ApiKeyService.hashKey(rawKey),
        isActive: true,
        expiresAt: pastDate,
      }]);

      const result = await ApiKeyService.validateKey(rawKey);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('expired');
      }
    });

    it('should reject a non-existent key', async () => {
      const mockFrom = vi.fn();
      const mockWhere = vi.fn();
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockResolvedValueOnce([]);

      const result = await ApiKeyService.validateKey('fst_nonexistent');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid');
      }
    });
  });

  describe('revoke', () => {
    it('should set isActive to false', async () => {
      const mockSet = vi.fn();
      const mockWhere = vi.fn();
      const mockReturning = vi.fn();
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockReturning.mockResolvedValue([{ id: 'key-1' }]);

      const result = await ApiKeyService.revoke('key-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('key-1');
      }
    });
  });
});
