import 'server-only';

import { db } from '@/server/db';
import { rateCatalogRepository } from '../repositories/rate-catalog.repository';
import type { ReorderCatalogInput } from '../validation/reorder-catalog-input.schema';

export class CatalogReorderConflictError extends Error {
  constructor() {
    super('The catalog changed or the requested order is invalid.');
    this.name = 'CatalogReorderConflictError';
  }
}

function assertCatalogReorder({
  authoritativeIds,
  expectedIds,
  orderedIds,
}: {
  authoritativeIds: readonly string[];
  expectedIds: readonly string[];
  orderedIds: readonly string[];
}) {
  if (
    authoritativeIds.length !== expectedIds.length ||
    authoritativeIds.some((id, index) => id !== expectedIds[index])
  ) {
    throw new CatalogReorderConflictError();
  }

  if (
    authoritativeIds.length !== orderedIds.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    orderedIds.some((id) => !authoritativeIds.includes(id))
  ) {
    throw new CatalogReorderConflictError();
  }
}

export async function reorderCatalogUseCase(input: ReorderCatalogInput) {
  return db.transaction(async (tx) => {
    const options = { tx };
    const authoritativeIds = await rateCatalogRepository.getOrderedIds(
      input.catalog,
      options,
    );
    assertCatalogReorder({
      authoritativeIds,
      expectedIds: input.expectedIds,
      orderedIds: input.orderedIds,
    });

    return rateCatalogRepository.replaceCatalogOrder(
      input.catalog,
      input.orderedIds,
      options,
    );
  });
}
