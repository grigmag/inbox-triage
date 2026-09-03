import { z } from 'zod';
import { RATE_CATALOG_VALIDATION_MESSAGES } from './validation-messages';
import { catalogItemIdSchema, rateCatalogSchema } from './catalog.schema';

const orderedCatalogIdsSchema = z
  .array(catalogItemIdSchema)
  .min(1, RATE_CATALOG_VALIDATION_MESSAGES.reorder.empty)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    RATE_CATALOG_VALIDATION_MESSAGES.reorder.duplicate,
  );

export const reorderCatalogInputSchema = z.object({
  catalog: rateCatalogSchema,
  expectedIds: orderedCatalogIdsSchema,
  orderedIds: orderedCatalogIdsSchema,
});

export type ReorderCatalogInput = z.output<typeof reorderCatalogInputSchema>;
