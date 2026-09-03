import { describe, expect, it } from 'vitest';
import { RATE_CATALOG_VALIDATION_MESSAGES } from './validation-messages';
import { crewRateItemInputSchema } from './crew-rate-item-input.schema';
import { CATALOG_NAME_MAX_LENGTH } from './rate-item-fields';

describe('crewRateItemInputSchema', () => {
  it('trims names, converts money to cents, and defaults active state', () => {
    expect(
      crewRateItemInputSchema.parse({ name: '  Director ', dayRate: '700' }),
    ).toEqual({ name: 'Director', dayRateCents: 70_000, isActive: true });
  });

  it.each([
    ['', RATE_CATALOG_VALIDATION_MESSAGES.catalog.nameRequired],
    ['   ', RATE_CATALOG_VALIDATION_MESSAGES.catalog.nameRequired],
    [
      'a'.repeat(CATALOG_NAME_MAX_LENGTH + 1),
      RATE_CATALOG_VALIDATION_MESSAGES.catalog.nameTooLong,
    ],
  ])('rejects catalog name %j with exact copy', (name, message) => {
    const result = crewRateItemInputSchema.safeParse({ name, dayRate: '0' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({ path: ['name'], message });
    }
  });

  it('accepts a catalog name at the approved boundary', () => {
    expect(
      crewRateItemInputSchema.safeParse({
        name: 'a'.repeat(CATALOG_NAME_MAX_LENGTH),
        dayRate: '0',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['-1', RATE_CATALOG_VALIDATION_MESSAGES.catalog.money],
    ['1e2', RATE_CATALOG_VALIDATION_MESSAGES.catalog.money],
    ['1.001', RATE_CATALOG_VALIDATION_MESSAGES.catalog.moneyPrecision],
    ['21474836.48', RATE_CATALOG_VALIDATION_MESSAGES.catalog.numericRange],
  ])('maps invalid money %j to exact field copy', (dayRate, message) => {
    const result = crewRateItemInputSchema.safeParse({
      name: 'Director',
      dayRate,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ['dayRate'],
        message,
      });
    }
  });
});
