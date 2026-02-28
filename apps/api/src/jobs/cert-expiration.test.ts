// ===========================================
// Certificate Expiration Job Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  return {
    db: {
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    },
    __mocks: { mockSelect, mockUpdate, mockDelete },
  };
});

vi.mock('../services/notification.service.js', () => ({
  NotificationService: {
    create: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

import { checkCertificateExpiration } from './cert-expiration.js';
import { __mocks } from '../lib/db.js';
import { NotificationService } from '../services/notification.service.js';

const { mockSelect, mockUpdate } = __mocks as unknown as {
  mockSelect: ReturnType<typeof vi.fn>;
  mockUpdate: ReturnType<typeof vi.fn>;
};

describe('checkCertificateExpiration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark expired certificates and check warnings', async () => {
    // Mock update for marking expired certs
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    // Mock selects: expiring certs checks (3 warning windows), stale CRLs
    let selectCallCount = 0;
    mockSelect.mockImplementation(() => {
      selectCallCount++;

      // Expiring cert checks (3 windows) + stale CRL check
      if (selectCallCount <= 3) {
        // Expiring certs - return empty
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      }
      // Stale CRLs check
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    await checkCertificateExpiration();

    // Should have called update once (mark expired)
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    // Should have called select 4 times (3 warning windows + 1 stale CRL check)
    expect(mockSelect).toHaveBeenCalledTimes(4);
  });

  it('should send notifications for expiring certificates', async () => {
    // Mock update for marking expired certs (none expired)
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const expiringCert = {
      id: '10000000-0000-4000-8000-000000000001',
      commonName: 'test.example.com',
      notAfter: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
      certType: 'server',
      issuingCaId: '10000000-0000-4000-8000-000000000002',
    };

    const adminResult = [{ userId: '10000000-0000-4000-8000-000000000003' }];

    let selectCallCount = 0;
    mockSelect.mockImplementation(() => {
      selectCallCount++;

      if (selectCallCount === 1) {
        // First warning window (30 days) - return expiring cert
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([expiringCert]),
          }),
        };
      }
      if (selectCallCount === 2) {
        // PKI admin user IDs query (with innerJoin)
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(adminResult),
            }),
          }),
        };
      }
      // Remaining calls return empty
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    await checkCertificateExpiration();

    expect(NotificationService.create).toHaveBeenCalled();
  });
});
