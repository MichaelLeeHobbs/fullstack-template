// ===========================================
// Settings Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/settings.service.js', () => ({
  SettingsService: {
    getAll: vi.fn(),
    getByKey: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { SettingsController } from './settings.controller.js';
import { SettingsService } from '../services/settings.service.js';
import { ServiceError } from '../lib/service-error.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';

describe('SettingsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list()', () => {
    it('should return 200 with grouped settings', async () => {
      const settings = [
        { id: '1', key: 'security.key1', value: '10', type: 'number', category: 'security' },
        { id: '2', key: 'ui.theme', value: 'dark', type: 'string', category: 'ui' },
      ];

      (SettingsService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: settings,
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await SettingsController.list(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: {
          settings,
          grouped: {
            security: [settings[0]],
            ui: [settings[1]],
          },
        },
      });
    });

    it('should return 500 on service error', async () => {
      (SettingsService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB error'),
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await SettingsController.list(req, res as any);

      expect(res._status).toBe(500);
      expect(res._json).toEqual({
        success: false,
        error: 'Failed to retrieve settings',
      });
    });
  });

  describe('get()', () => {
    it('should return 200 with setting', async () => {
      const setting = { id: '1', key: 'security.key1', value: '10', type: 'number', category: 'security' };

      (SettingsService.getByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: setting,
      });

      const req = createMockRequest({ params: { key: 'security.key1' } });
      const res = createMockResponse();

      await SettingsController.get(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: setting });
    });

    it('should return 400 when key is missing', async () => {
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      await SettingsController.get(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({
        success: false,
        error: 'Setting key is required',
      });
    });

    it('should return 404 when setting not found', async () => {
      (SettingsService.getByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('NOT_FOUND', 'Setting not found'),
      });

      const req = createMockRequest({ params: { key: 'nonexistent' } });
      const res = createMockResponse();

      await SettingsController.get(req, res as any);

      expect(res._status).toBe(404);
    });

    it('should return 500 on generic service error', async () => {
      (SettingsService.getByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB error'),
      });

      const req = createMockRequest({ params: { key: 'some.key' } });
      const res = createMockResponse();

      await SettingsController.get(req, res as any);

      expect(res._status).toBe(500);
    });
  });

  describe('update()', () => {
    it('should return 200 on successful update', async () => {
      (SettingsService.set as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const req = createMockRequest({
        params: { key: 'security.key1' },
        body: { value: 10 },
      });
      const res = createMockResponse();

      await SettingsController.update(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: { message: 'Setting updated successfully' },
      });
    });

    it('should return 400 when key is missing', async () => {
      const req = createMockRequest({ params: {}, body: { value: 10 } });
      const res = createMockResponse();

      await SettingsController.update(req, res as any);

      expect(res._status).toBe(400);
    });

    it('should return 404 when setting not found', async () => {
      (SettingsService.set as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('NOT_FOUND', 'Setting not found'),
      });

      const req = createMockRequest({
        params: { key: 'nonexistent' },
        body: { value: 'abc' },
      });
      const res = createMockResponse();

      await SettingsController.update(req, res as any);

      expect(res._status).toBe(404);
    });

    it('should return 500 on generic error', async () => {
      (SettingsService.set as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB error'),
      });

      const req = createMockRequest({
        params: { key: 'some.key' },
        body: { value: 'abc' },
      });
      const res = createMockResponse();

      await SettingsController.update(req, res as any);

      expect(res._status).toBe(500);
    });
  });
});
