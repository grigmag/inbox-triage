import { describe, expect, it } from 'vitest';
import {
  CatalogItemNotFoundError,
  CatalogNameConflictError,
} from '../errors/catalog.errors';
import { RATE_CATALOG_VALIDATION_MESSAGES } from '../validation/validation-messages';
import { catalogWriteErrorResult } from './catalog-write-error-result';

describe('catalogWriteErrorResult', () => {
  it('returns a safe field conflict for a duplicate name', () => {
    expect(catalogWriteErrorResult(new CatalogNameConflictError())).toEqual({
      status: 'conflict',
      message: RATE_CATALOG_VALIDATION_MESSAGES.catalog.duplicateName,
      fieldErrors: {
        name: RATE_CATALOG_VALIDATION_MESSAGES.catalog.duplicateName,
      },
    });
  });

  it('returns a safe not-found result for a missing item', () => {
    expect(catalogWriteErrorResult(new CatalogItemNotFoundError())).toEqual({
      status: 'not_found',
      message: 'Catalog item was not found.',
    });
  });

  it('does not map unexpected errors', () => {
    expect(catalogWriteErrorResult(new Error('unexpected'))).toBeUndefined();
  });
});
