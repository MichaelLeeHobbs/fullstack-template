// ===========================================
// Settings Service Tests
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

vi.mock('../lib/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { SettingsService } from './settings.service.js';
import { db } from '../lib/db.js';

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache between tests
    SettingsService.clearCache();
  });

  describe('get()', () => {
    it('should return value from database when not cached', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ key: 'security.max_login_attempts', value: '10', type: 'number' }]),
        }),
      });

      const result = await SettingsService.get<number>('security.max_login_attempts', 5);

      expect(result).toBe(10);
    });

    it('should return cached value on subsequent call', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ key: 'test.key', value: 'hello', type: 'string' }]),
        }),
      });

      // First call populates cache
      const first = await SettingsService.get<string>('test.key', 'default');
      expect(first).toBe('hello');

      // Second call should use cache (db won't be called again for this key)
      const second = await SettingsService.get<string>('test.key', 'default');
      expect(second).toBe('hello');
    });

    it('should return default value when setting not found in DB', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await SettingsService.get<number>('nonexistent.key', 42);

      expect(result).toBe(42);
    });

    it('should return default value when DB query fails', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB connection error')),
        }),
      });

      const result = await SettingsService.get<number>('some.key', 99);

      expect(result).toBe(99);
    });

    it('should parse boolean values correctly', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ key: 'feature.enabled', value: 'true', type: 'boolean' }]),
        }),
      });

      const result = await SettingsService.get<boolean>('feature.enabled', false);

      expect(result).toBe(true);
    });

    it('should parse JSON values correctly', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ key: 'ui.config', value: '{"theme":"dark"}', type: 'json' }]),
        }),
      });

      const result = await SettingsService.get<{ theme: string }>('ui.config', { theme: 'light' });

      expect(result).toEqual({ theme: 'dark' });
    });
  });

  describe('set()', () => {
    it('should update a setting and clear cache', async () => {
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ key: 'test.key' }]),
          }),
        }),
      });

      const result = await SettingsService.set('test.key', 'new-value');

      expect(result.ok).toBe(true);
    });

    it('should return error when setting not found', async () => {
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await SettingsService.set('nonexistent.key', 'value');

      expect(result.ok).toBe(false);
      expect(result.error?.message).toContain('Setting not found');
    });

    it('should stringify object values', async () => {
      const mockReturning = vi.fn().mockResolvedValue([{ key: 'test.json' }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      const result = await SettingsService.set('test.json', { key: 'value' });

      expect(result.ok).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ value: '{"key":"value"}' })
      );
    });
  });

  describe('getByKey()', () => {
    it('should return the full setting object', async () => {
      const setting = {
        id: 'setting-1',
        key: 'test.key',
        value: 'hello',
        type: 'string',
        category: 'test',
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([setting]),
        }),
      });

      const result = await SettingsService.getByKey('test.key');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(setting);
      }
    });

    it('should return NOT_FOUND when key does not exist', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await SettingsService.getByKey('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('getAll()', () => {
    it('should return all settings ordered', async () => {
      const settings = [
        { id: '1', key: 'a.key', value: '1', type: 'number', category: 'a' },
        { id: '2', key: 'b.key', value: '2', type: 'number', category: 'b' },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(settings),
        }),
      });

      const result = await SettingsService.getAll();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe('getByCategory()', () => {
    it('should return settings filtered by category', async () => {
      const settings = [
        { id: '1', key: 'security.key1', value: '1', type: 'number', category: 'security' },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(settings),
          }),
        }),
      });

      const result = await SettingsService.getByCategory('security');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
      }
    });
  });

  describe('clearCache()', () => {
    it('should clear cached settings', async () => {
      // Populate cache first
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ key: 'cached.key', value: 'cached', type: 'string' }]),
        }),
      });

      await SettingsService.get('cached.key', 'default');

      // Clear cache
      SettingsService.clearCache();

      // Next call should hit DB again
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ key: 'cached.key', value: 'new-value', type: 'string' }]),
        }),
      });

      const result = await SettingsService.get('cached.key', 'default');
      expect(result).toBe('new-value');
    });
  });
});
