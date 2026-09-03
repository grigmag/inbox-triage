import { describe, expect, it } from 'vitest';
import { RATE_CATALOG_VALIDATION_MESSAGES } from './validation-messages';
import { reorderCatalogInputSchema } from './reorder-catalog-input.schema';

describe('reorderCatalogInputSchema', () => {
  const firstId = '5f7de8f4-35b8-4aea-a55e-fecd244f90b7';
  const secondId = 'fb9418e1-f80a-44ae-b876-9d397e6f00e1';

  it('accepts a non-empty unique UUID list', () => {
    expect(
      reorderCatalogInputSchema.parse({
        catalog: 'crew',
        expectedIds: [firstId, secondId],
        orderedIds: [firstId, secondId],
      }),
    ).toEqual({
      catalog: 'crew',
      expectedIds: [firstId, secondId],
      orderedIds: [firstId, secondId],
    });
  });

  it.each([
    [[], RATE_CATALOG_VALIDATION_MESSAGES.reorder.empty],
    [[firstId, firstId], RATE_CATALOG_VALIDATION_MESSAGES.reorder.duplicate],
    [['not-a-uuid'], RATE_CATALOG_VALIDATION_MESSAGES.reorder.invalidId],
  ])('rejects invalid ordered IDs with exact copy', (orderedIds, message) => {
    const result = reorderCatalogInputSchema.safeParse({
      catalog: 'crew',
      expectedIds: [firstId, secondId],
      orderedIds,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message === message),
      ).toBe(true);
    }
  });

  it('validates the expected order independently', () => {
    const result = reorderCatalogInputSchema.safeParse({
      catalog: 'crew',
      expectedIds: [firstId, firstId],
      orderedIds: [firstId, secondId],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['expectedIds']);
      expect(result.error.issues[0]?.message).toBe(
        RATE_CATALOG_VALIDATION_MESSAGES.reorder.duplicate,
      );
    }
  });
});
