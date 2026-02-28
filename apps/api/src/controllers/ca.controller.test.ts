// ===========================================
// CA Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/ca.service.js', () => ({
  CaService: {
    createRootCA: vi.fn(),
    createIntermediateCA: vi.fn(),
    getById: vi.fn(),
    list: vi.fn(),
    getHierarchy: vi.fn(),
    update: vi.fn(),
    suspend: vi.fn(),
    retire: vi.fn(),
    getChain: vi.fn(),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { CaController } from './ca.controller.js';
import { CaService } from '../services/ca.service.js';
import { ServiceError } from '../lib/service-error.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';

describe('CaController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create()', () => {
    it('should return 201 with root CA data (no parentCaId)', async () => {
      const mockCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test Root CA',
        isRoot: true,
        status: 'active',
      };

      (CaService.createRootCA as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: mockCa,
      });

      const req = createMockRequest({
        body: {
          name: 'Test Root CA',
          commonName: 'Test Root CA',
          passphrase: 'secure-passphrase',
          keyAlgorithm: 'rsa',
        },
        user: { id: '10000000-0000-4000-a000-000000000001' },
      });
      const res = createMockResponse();

      await CaController.create(req, res as any);

      expect(res._status).toBe(201);
      expect(res._json).toEqual({ success: true, data: mockCa });
      expect(CaService.createRootCA).toHaveBeenCalled();
    });

    it('should return 201 with intermediate CA data (parentCaId present)', async () => {
      const mockCa = {
        id: '10000000-0000-4000-8000-000000000002',
        name: 'Test Intermediate CA',
        isRoot: false,
        parentCaId: '10000000-0000-4000-8000-000000000001',
        status: 'active',
      };

      (CaService.createIntermediateCA as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: mockCa,
      });

      const req = createMockRequest({
        body: {
          name: 'Test Intermediate CA',
          commonName: 'Test Intermediate CA',
          passphrase: 'secure-passphrase',
          parentCaId: '10000000-0000-4000-8000-000000000001',
          parentPassphrase: 'parent-passphrase',
          keyAlgorithm: 'rsa',
        },
        user: { id: '10000000-0000-4000-a000-000000000001' },
      });
      const res = createMockResponse();

      await CaController.create(req, res as any);

      expect(res._status).toBe(201);
      expect(res._json).toEqual({ success: true, data: mockCa });
      expect(CaService.createIntermediateCA).toHaveBeenCalled();
    });

    it('should return 404 when parent CA not found', async () => {
      (CaService.createIntermediateCA as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('CA_NOT_FOUND', 'Parent CA not found'),
      });

      const req = createMockRequest({
        body: {
          name: 'Intermediate CA',
          commonName: 'Intermediate CA',
          passphrase: 'secure-passphrase',
          parentCaId: '10000000-0000-4000-8000-000000000099',
          parentPassphrase: 'parent-passphrase',
        },
        user: { id: '10000000-0000-4000-a000-000000000001' },
      });
      const res = createMockResponse();

      await CaController.create(req, res as any);

      expect(res._status).toBe(404);
      expect(res._json).toEqual({ success: false, error: 'Parent CA not found' });
    });

    it('should return 400 for invalid passphrase', async () => {
      (CaService.createIntermediateCA as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('INVALID_PASSPHRASE', 'Failed to decrypt parent CA private key — incorrect passphrase'),
      });

      const req = createMockRequest({
        body: {
          name: 'Intermediate CA',
          commonName: 'Intermediate CA',
          passphrase: 'secure-passphrase',
          parentCaId: '10000000-0000-4000-8000-000000000001',
          parentPassphrase: 'wrong-passphrase',
        },
        user: { id: '10000000-0000-4000-a000-000000000001' },
      });
      const res = createMockResponse();

      await CaController.create(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Invalid parent CA passphrase' });
    });

    it('should return 401 when not authenticated', async () => {
      const req = createMockRequest({
        body: {
          name: 'Test CA',
          commonName: 'Test CA',
          passphrase: 'secure-passphrase',
        },
        user: undefined,
      });
      const res = createMockResponse();

      await CaController.create(req, res as any);

      expect(res._status).toBe(401);
      expect(res._json).toEqual({ success: false, error: 'Unauthorized' });
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------

  describe('list()', () => {
    it('should return 200 with CA list', async () => {
      const mockData = {
        cas: [
          { id: '10000000-0000-4000-8000-000000000001', name: 'Root CA', status: 'active' },
          { id: '10000000-0000-4000-8000-000000000002', name: 'Intermediate CA', status: 'active' },
        ],
        total: 2,
      };

      (CaService.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: mockData,
      });

      const req = createMockRequest({ query: { page: 1, limit: 20 } });
      const res = createMockResponse();

      await CaController.list(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: mockData });
    });
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------

  describe('getById()', () => {
    it('should return 200 with CA data', async () => {
      const mockCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test Root CA',
        status: 'active',
      };

      (CaService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: mockCa,
      });

      const req = createMockRequest({ params: { id: '10000000-0000-4000-8000-000000000001' } });
      const res = createMockResponse();

      await CaController.getById(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: mockCa });
    });

    it('should return 404 when not found', async () => {
      (CaService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('CA_NOT_FOUND', 'Certificate authority not found'),
      });

      const req = createMockRequest({ params: { id: '10000000-0000-4000-8000-000000000099' } });
      const res = createMockResponse();

      await CaController.getById(req, res as any);

      expect(res._status).toBe(404);
      expect(res._json).toEqual({ success: false, error: 'CA not found' });
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update()', () => {
    it('should return 200 with updated CA', async () => {
      const updatedCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Updated CA Name',
        status: 'active',
      };

      (CaService.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: updatedCa,
      });

      const req = createMockRequest({
        params: { id: '10000000-0000-4000-8000-000000000001' },
        body: { name: 'Updated CA Name' },
        user: { id: '10000000-0000-4000-a000-000000000001' },
      });
      const res = createMockResponse();

      await CaController.update(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: updatedCa });
    });
  });

  // -----------------------------------------------------------------------
  // suspend
  // -----------------------------------------------------------------------

  describe('suspend()', () => {
    it('should return 200 when suspending active CA', async () => {
      const suspendedCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test CA',
        status: 'suspended',
      };

      (CaService.suspend as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: suspendedCa,
      });

      const req = createMockRequest({
        params: { id: '10000000-0000-4000-8000-000000000001' },
        user: { id: '10000000-0000-4000-a000-000000000001' },
      });
      const res = createMockResponse();

      await CaController.suspend(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: suspendedCa });
    });

    it('should return 400 when CA is not active', async () => {
      (CaService.suspend as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('CA_NOT_ACTIVE', 'Only active CAs can be suspended'),
      });

      const req = createMockRequest({
        params: { id: '10000000-0000-4000-8000-000000000001' },
        user: { id: '10000000-0000-4000-a000-000000000001' },
      });
      const res = createMockResponse();

      await CaController.suspend(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Only active CAs can be suspended' });
    });
  });

  // -----------------------------------------------------------------------
  // retire
  // -----------------------------------------------------------------------

  describe('retire()', () => {
    it('should return 200 when retiring CA', async () => {
      const retiredCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test CA',
        status: 'retired',
      };

      (CaService.retire as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: retiredCa,
      });

      const req = createMockRequest({
        params: { id: '10000000-0000-4000-8000-000000000001' },
        user: { id: '10000000-0000-4000-a000-000000000001' },
      });
      const res = createMockResponse();

      await CaController.retire(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: retiredCa });
    });
  });

  // -----------------------------------------------------------------------
  // getChain
  // -----------------------------------------------------------------------

  describe('getChain()', () => {
    it('should return 200 with certificate chain', async () => {
      const chain = [
        '-----BEGIN CERTIFICATE-----\nINTERMEDIATE\n-----END CERTIFICATE-----',
        '-----BEGIN CERTIFICATE-----\nROOT\n-----END CERTIFICATE-----',
      ];

      (CaService.getChain as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: chain,
      });

      const req = createMockRequest({
        params: { id: '10000000-0000-4000-8000-000000000002' },
      });
      const res = createMockResponse();

      await CaController.getChain(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: chain });
    });
  });
});
