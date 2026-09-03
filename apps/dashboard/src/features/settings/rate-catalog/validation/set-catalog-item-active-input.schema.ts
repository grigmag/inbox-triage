import { z } from 'zod';
import { catalogItemIdSchema, rateCatalogSchema } from './catalog.schema';

export const setCatalogItemActiveInputSchema = z.object({
  catalog: rateCatalogSchema,
  id: catalogItemIdSchema,
  isActive: z.boolean(),
});

export type SetCatalogItemActiveInput = z.output<
  typeof setCatalogItemActiveInputSchema
>;
