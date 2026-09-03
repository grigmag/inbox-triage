import { z } from 'zod';
import { RATE_CATALOG_VALIDATION_MESSAGES } from './validation-messages';

export const rateCatalogSchema = z.enum(['crew', 'deliverable', 'addon']);

export const catalogItemIdSchema = z.uuid({
  error: RATE_CATALOG_VALIDATION_MESSAGES.reorder.invalidId,
});

export type RateCatalog = z.infer<typeof rateCatalogSchema>;
