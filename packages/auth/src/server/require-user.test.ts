import type { Db } from '@inbox-triage/db/client';
import type { User } from '@inbox-triage/db/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireUser } from './require-user';

const { protect } = vi.hoisted(() => ({
  protect: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: {
    protect,
  },
}));

const clerkUserId = 'user_clerk_1';
const localUser = createUser({ clerkUserId });

describe('requireUser', () => {
  beforeEach(() => {
    protect.mockReset();
    protect.mockResolvedValue({ userId: clerkUserId });
  });

  it('propagates unauthenticated rejection without reading users', async () => {
    const unauthenticated = new Error('unauthenticated');
    protect.mockRejectedValue(unauthenticated);

    const findFirst = vi.fn();
    const insertReturning = vi.fn();
    const db = createDb({ findFirst, insertReturning });

    await expect(requireUser(db)).rejects.toBe(unauthenticated);
    expect(findFirst).not.toHaveBeenCalled();
    expect(insertReturning).not.toHaveBeenCalled();
  });

  it('returns the existing local user without inserting', async () => {
    const findFirst = vi.fn().mockResolvedValue(localUser);
    const insertReturning = vi.fn();
    const db = createDb({ findFirst, insertReturning });

    await expect(requireUser(db)).resolves.toEqual(localUser);
    expect(insertReturning).not.toHaveBeenCalled();
  });

  it('inserts a local user on first authenticated access', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const insertReturning = vi.fn().mockResolvedValue([localUser]);
    const db = createDb({ findFirst, insertReturning });

    await expect(requireUser(db)).resolves.toEqual(localUser);
    expect(insertReturning).toHaveBeenCalledOnce();
  });

  it('recovers the winning row when a conflicting insert creates no row', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(localUser);
    const insertReturning = vi.fn().mockResolvedValue([]);
    const db = createDb({ findFirst, insertReturning });

    await expect(requireUser(db)).resolves.toEqual(localUser);
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it('maps concurrent first-access requests to one local user', async () => {
    const store = new Map<string, User>();
    let lookupCount = 0;
    const bothLookupsStarted = Promise.withResolvers<void>();
    const releaseLookups = Promise.withResolvers<void>();

    const findFirst = vi.fn(async () => {
      lookupCount += 1;
      if (lookupCount === 2) {
        bothLookupsStarted.resolve();
      }

      await releaseLookups.promise;
      return store.get(clerkUserId);
    });

    const insertReturning = vi.fn(async () => {
      if (store.has(clerkUserId)) {
        return [];
      }

      store.set(clerkUserId, localUser);
      return [localUser];
    });

    const db = createDb({ findFirst, insertReturning });
    const results = Promise.all([requireUser(db), requireUser(db)]);

    await bothLookupsStarted.promise;
    releaseLookups.resolve();

    const [first, second] = await results;

    expect(first).toEqual(localUser);
    expect(second).toEqual(localUser);
    expect(store.size).toBe(1);
    expect(insertReturning).toHaveBeenCalledTimes(2);
  });
});

function createUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    id: '11111111-1111-1111-1111-111111111111',
    clerkUserId: 'user_clerk_1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createDb({
  findFirst,
  insertReturning,
}: {
  findFirst: ReturnType<typeof vi.fn>;
  insertReturning: ReturnType<typeof vi.fn>;
}): Db {
  return {
    query: {
      users: {
        findFirst,
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: insertReturning,
        })),
      })),
    })),
  } as unknown as Db;
}
