// ===========================================
// Service Account Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete },
  };
});

import { ServiceAccountService } from './service-account.service.js';
import { db } from '../lib/db.js';

describe('ServiceAccountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a service account', async () => {
      const now = new Date();

      // Check for existing email — none found
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      // Insert user
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'sa-1',
            email: 'bot@example.com',
            isActive: true,
            createdAt: now,
          }]),
        }),
      });

      const result = await ServiceAccountService.create('Bot@Example.com');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe('bot@example.com');
        expect(result.value.apiKeyCount).toBe(0);
      }
    });

    it('should return error for duplicate email', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'existing-user' }]),
        }),
      });

      const result = await ServiceAccountService.create('existing@example.com');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'ALREADY_EXISTS');
    });
  });

  describe('list()', () => {
    it('should return paginated service accounts with API key counts', async () => {
      const now = new Date();
      const accounts = [
        { id: 'sa-1', email: 'bot1@example.com', isActive: true, createdAt: now },
        { id: 'sa-2', email: 'bot2@example.com', isActive: true, createdAt: now },
      ];

      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;

        if (selectCallCount === 1) {
          // Count query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 2 }]),
            }),
          };
        }

        if (selectCallCount === 2) {
          // Accounts query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(accounts),
                  }),
                }),
              }),
            }),
          };
        }

        // API key counts query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                { userId: 'sa-1', count: 3 },
              ]),
            }),
          }),
        };
      });

      const result = await ServiceAccountService.list(1, 20);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(2);
        expect(result.value.data[0]!.apiKeyCount).toBe(3);
        expect(result.value.data[1]!.apiKeyCount).toBe(0);
        expect(result.value.pagination.total).toBe(2);
      }
    });

    it('should return empty result when no accounts exist', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        };
      });

      const result = await ServiceAccountService.list(1, 20);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(0);
      }
    });
  });

  describe('delete()', () => {
    it('should delete an existing service account', async () => {
      // Verify it's a service account
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'sa-1', accountType: 'service' }]),
        }),
      });

      // Delete user
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await ServiceAccountService.delete('sa-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.deleted).toBe(true);
      }
    });

    it('should return NOT_FOUND for non-existent service account', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await ServiceAccountService.delete('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});
