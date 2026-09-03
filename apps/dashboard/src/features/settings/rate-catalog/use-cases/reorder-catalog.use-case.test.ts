import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CatalogReorderConflictError,
  reorderCatalogUseCase,
} from './reorder-catalog.use-case';

const repository = vi.hoisted(() => ({
  getOrderedIds: vi.fn(),
  replaceCatalogOrder: vi.fn(),
}));
const transaction = vi.hoisted(() => {
  const value = {};
  return {
    value,
    run: vi.fn(async (callback: (tx: object) => Promise<unknown>) =>
      callback(value),
    ),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/server/db', () => ({
  db: { transaction: transaction.run },
}));
vi.mock('../repositories/rate-catalog.repository', () => ({
  rateCatalogRepository: repository,
}));

const firstId = '5f7de8f4-35b8-4aea-a55e-fecd244f90b7';
const secondId = 'fb9418e1-f80a-44ae-b876-9d397e6f00e1';
const thirdId = '79fc82a3-c516-43e2-9a48-e0bd76f5761f';
const saved = [firstId, secondId, thirdId];

describe('reorderCatalogUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.getOrderedIds.mockResolvedValue(saved);
  });

  it('rejects a stale expected order without producing writes', async () => {
    await expect(
      reorderCatalogUseCase({
        catalog: 'crew',
        expectedIds: [secondId, firstId, thirdId],
        orderedIds: saved,
      }),
    ).rejects.toBeInstanceOf(CatalogReorderConflictError);
    expect(repository.getOrderedIds).toHaveBeenCalledWith('crew', {
      tx: transaction.value,
    });
    expect(repository.replaceCatalogOrder).not.toHaveBeenCalled();
  });

  it.each([
    [firstId, secondId],
    [firstId, secondId, secondId],
    [firstId, secondId, 'bc7a53b5-512f-475d-bd66-cf76d31ad49f'],
  ])(
    'rejects an incomplete, duplicate, or unknown requested list',
    async (...order) => {
      await expect(
        reorderCatalogUseCase({
          catalog: 'crew',
          expectedIds: saved,
          orderedIds: order,
        }),
      ).rejects.toBeInstanceOf(CatalogReorderConflictError);
      expect(repository.replaceCatalogOrder).not.toHaveBeenCalled();
    },
  );

  it('persists and returns a complete requested order', async () => {
    const orderedIds = [thirdId, firstId, secondId];
    const data = [{ id: thirdId }];
    repository.replaceCatalogOrder.mockResolvedValue(data);

    await expect(
      reorderCatalogUseCase({
        catalog: 'crew',
        expectedIds: saved,
        orderedIds,
      }),
    ).resolves.toBe(data);
    expect(repository.replaceCatalogOrder).toHaveBeenCalledWith(
      'crew',
      orderedIds,
      {
        tx: transaction.value,
      },
    );
  });
});
