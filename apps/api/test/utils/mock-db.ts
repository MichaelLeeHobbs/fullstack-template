// ===========================================
// DB Mock Helpers
// ===========================================
// Chain helpers for setting up Drizzle-style mock return values.
//
// NOTE: createMockDbModule() cannot be called inside vi.mock() factories
// due to hoisting. Each test file must inline the vi.mock factory:
//
//   vi.mock('../lib/db.js', () => {
//     const mockSelect = vi.fn();
//     const mockInsert = vi.fn();
//     const mockUpdate = vi.fn();
//     const mockDelete = vi.fn();
//     const mockTransaction = vi.fn(async (cb) => cb({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete }));
//     return { db: { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, transaction: mockTransaction }, __mocks: { ... } };
//   });

import { vi } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

/** select().from().where() → data */
export function mockSelectChain(mockSelect: MockFn, data: unknown[]) {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(data),
    }),
  });
}

/** select().from().innerJoin().where() → data */
export function mockSelectWithJoinChain(mockSelect: MockFn, data: unknown[]) {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(data),
      }),
    }),
  });
}

/** insert().values().returning() → data */
export function mockInsertChain(mockInsert: MockFn, data: unknown[]) {
  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(data),
    }),
  });
}

/** update().set().where().returning() → data */
export function mockUpdateChain(mockUpdate: MockFn, data: unknown[]) {
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(data),
      }),
    }),
  });
}

/** update().set().where() → void */
export function mockUpdateSetWhereChain(mockUpdate: MockFn) {
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

/** delete().where() → void */
export function mockDeleteChain(mockDelete: MockFn) {
  mockDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
}
