// ===========================================
// MFA Service Tests
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

vi.mock('../lib/crypto.js', () => ({
  encrypt: vi.fn((val: string) => `encrypted:${val}`),
  decrypt: vi.fn((val: string) => val.replace('encrypted:', '')),
  isEncrypted: vi.fn((val: string) => val.startsWith('encrypted:')),
}));

vi.mock('otpauth', () => {
  const mockValidate = vi.fn();
  const mockToString = vi.fn().mockReturnValue('otpauth://totp/test');

  class MockSecret {
    base32: string;
    constructor() { this.base32 = 'JBSWY3DPEHPK3PXP'; }
    static fromBase32(_s: string) { return new MockSecret(); }
  }

  class MockTOTP {
    secret: MockSecret;
    constructor(opts: { secret?: MockSecret }) {
      this.secret = opts.secret ?? new MockSecret();
    }
    validate = mockValidate;
    toString = mockToString;
  }

  return {
    TOTP: MockTOTP,
    Secret: MockSecret,
    __mocks: { mockValidate },
  };
});

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qrcode'),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('$2b$10$hashed'),
  },
}));

import { MfaService } from './mfa.service.js';
import { db } from '../lib/db.js';
import bcrypt from 'bcrypt';

// Get OTPAuth mocks
const otpauth = await import('otpauth') as any;
const { mockValidate } = otpauth.__mocks;

describe('MfaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEnabledMethods()', () => {
    it('should return enabled MFA methods', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ method: 'totp' }]),
        }),
      });

      const result = await MfaService.getEnabledMethods('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['totp']);
      }
    });

    it('should return empty array when no methods enabled', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await MfaService.getEnabledMethods('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('verify()', () => {
    it('should verify valid TOTP code', async () => {
      const record = {
        id: 'mfa-1',
        userId: 'user-1',
        method: 'totp',
        config: { secret: 'encrypted:JBSWY3DPEHPK3PXP', backupCodes: [] },
        isEnabled: true,
        isVerified: true,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([record]),
        }),
      });

      mockValidate.mockReturnValue(0); // Valid (delta = 0)

      const result = await MfaService.verify('user-1', 'totp', '123456');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.valid).toBe(true);
        expect(result.value.backupUsed).toBe(false);
      }
    });

    it('should verify valid backup code', async () => {
      const record = {
        id: 'mfa-1',
        userId: 'user-1',
        method: 'totp',
        config: { secret: 'encrypted:JBSWY3DPEHPK3PXP', backupCodes: ['$2b$10$hashedbackup'] },
        isEnabled: true,
        isVerified: true,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([record]),
        }),
      });

      mockValidate.mockReturnValue(null); // TOTP invalid
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true); // Backup matches

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await MfaService.verify('user-1', 'totp', 'backup123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.valid).toBe(true);
        expect(result.value.backupUsed).toBe(true);
      }
    });

    it('should return invalid for wrong code', async () => {
      const record = {
        id: 'mfa-1',
        userId: 'user-1',
        method: 'totp',
        config: { secret: 'encrypted:JBSWY3DPEHPK3PXP', backupCodes: [] },
        isEnabled: true,
        isVerified: true,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([record]),
        }),
      });

      mockValidate.mockReturnValue(null); // Invalid

      const result = await MfaService.verify('user-1', 'totp', '000000');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.valid).toBe(false);
      }
    });

    it('should return error for unsupported MFA method', async () => {
      const result = await MfaService.verify('user-1', 'sms', '123456');

      expect(result.ok).toBe(false);
      expect(result.error?.message).toContain('Unsupported MFA method');
    });
  });

  describe('setupTotp()', () => {
    it('should generate secret and QR code for new setup', async () => {
      // No existing record
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await MfaService.setupTotp('user-1', 'test@example.com');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.secret).toBeTruthy();
        expect(result.value.qrCodeDataUrl).toContain('data:image/png');
        expect(result.value.method).toBe('totp');
      }
    });

    it('should update existing record when re-setting up', async () => {
      // Existing record
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'mfa-1' }]),
        }),
      });

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await MfaService.setupTotp('user-1', 'test@example.com');

      expect(result.ok).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('verifyAndEnableTotp()', () => {
    it('should enable TOTP and return backup codes', async () => {
      const record = {
        id: 'mfa-1',
        userId: 'user-1',
        method: 'totp',
        config: { secret: 'encrypted:JBSWY3DPEHPK3PXP', backupCodes: [] },
        isEnabled: false,
        isVerified: false,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([record]),
        }),
      });

      mockValidate.mockReturnValue(0); // Valid code

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await MfaService.verifyAndEnableTotp('user-1', '123456');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.backupCodes).toHaveLength(10);
      }
    });

    it('should return error for invalid verification code', async () => {
      const record = {
        id: 'mfa-1',
        userId: 'user-1',
        method: 'totp',
        config: { secret: 'encrypted:JBSWY3DPEHPK3PXP', backupCodes: [] },
        isEnabled: false,
        isVerified: false,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([record]),
        }),
      });

      mockValidate.mockReturnValue(null); // Invalid

      const result = await MfaService.verifyAndEnableTotp('user-1', '000000');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('should return error when TOTP not set up', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await MfaService.verifyAndEnableTotp('user-1', '123456');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
    });
  });

  describe('disable()', () => {
    it('should disable MFA with valid code', async () => {
      // verify() call — need select for verifyTotp
      const record = {
        id: 'mfa-1',
        userId: 'user-1',
        method: 'totp',
        config: { secret: 'encrypted:JBSWY3DPEHPK3PXP', backupCodes: [] },
        isEnabled: true,
        isVerified: true,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([record]),
        }),
      });

      mockValidate.mockReturnValue(0); // Valid

      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await MfaService.disable('user-1', 'totp', '123456');

      expect(result.ok).toBe(true);
    });

    it('should return error for invalid verification code', async () => {
      const record = {
        id: 'mfa-1',
        userId: 'user-1',
        method: 'totp',
        config: { secret: 'encrypted:JBSWY3DPEHPK3PXP', backupCodes: [] },
        isEnabled: true,
        isVerified: true,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([record]),
        }),
      });

      mockValidate.mockReturnValue(null); // Invalid

      const result = await MfaService.disable('user-1', 'totp', '000000');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
    });
  });

  describe('regenerateBackupCodes()', () => {
    it('should regenerate backup codes with valid TOTP code', async () => {
      const record = {
        id: 'mfa-1',
        userId: 'user-1',
        method: 'totp',
        config: { secret: 'encrypted:JBSWY3DPEHPK3PXP', backupCodes: ['old1', 'old2'] },
        isEnabled: true,
        isVerified: true,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([record]),
        }),
      });

      mockValidate.mockReturnValue(0); // Valid

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await MfaService.regenerateBackupCodes('user-1', 'totp', '123456');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.backupCodes).toHaveLength(10);
      }
    });

    it('should return error for invalid TOTP code', async () => {
      const record = {
        id: 'mfa-1',
        userId: 'user-1',
        method: 'totp',
        config: { secret: 'encrypted:JBSWY3DPEHPK3PXP', backupCodes: [] },
        isEnabled: true,
        isVerified: true,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([record]),
        }),
      });

      mockValidate.mockReturnValue(null); // Invalid

      const result = await MfaService.regenerateBackupCodes('user-1', 'totp', '000000');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('should return NOT_FOUND when method not enabled', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await MfaService.regenerateBackupCodes('user-1', 'totp', '123456');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});
