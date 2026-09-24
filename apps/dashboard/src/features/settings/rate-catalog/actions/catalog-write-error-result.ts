import type { MutationActionResult } from '@/lib/actions/mutation-action-result';
import {
  CatalogItemNotFoundError,
  CatalogNameConflictError,
} from '../errors/catalog.errors';
import { RATE_CATALOG_VALIDATION_MESSAGES } from '../validation/validation-messages';

type CatalogWriteErrorResult = Extract<
  MutationActionResult<never, 'name'>,
  { status: 'conflict' | 'not_found' }
>;

export const CATALOG_SAVE_FAILURE = 'Could not save changes. Try again.';

export function catalogWriteErrorResult(
  error: unknown,
): CatalogWriteErrorResult | undefined {
  if (error instanceof CatalogNameConflictError) {
    return {
      status: 'conflict',
      message: RATE_CATALOG_VALIDATION_MESSAGES.catalog.duplicateName,
      fieldErrors: {
        name: RATE_CATALOG_VALIDATION_MESSAGES.catalog.duplicateName,
      },
    };
  }

  if (error instanceof CatalogItemNotFoundError) {
    return { status: 'not_found', message: 'Catalog item was not found.' };
  }
}
