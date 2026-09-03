import {
  ADDON_PRICING_MODES,
  type AddonPricingMode,
} from '@inbox-triage/domain/rates';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { RATE_CATALOG_VALIDATION_MESSAGES } from './validation-messages';
import {
  addonPricingModeSchema,
  addonRateItemInputSchema,
} from './addon-rate-item-input.schema';
import { PERCENTAGE_MAX } from './rate-item-fields';

describe('add-on rate item schemas', () => {
  it('derives the validation mode union from the shared values', () => {
    expectTypeOf<AddonPricingMode>().toEqualTypeOf<
      (typeof ADDON_PRICING_MODES)[number]
    >();
  });

  it.each(ADDON_PRICING_MODES)('accepts pricing mode %s', (mode) => {
    expect(addonPricingModeSchema.parse(mode)).toBe(mode);
  });

  it('rejects unsupported modes with exact copy', () => {
    const result = addonPricingModeSchema.safeParse('percent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        RATE_CATALOG_VALIDATION_MESSAGES.catalog.mode,
      );
    }
  });

  it('uses exact mode copy at the input boundary', () => {
    const result = addonRateItemInputSchema.safeParse({
      name: 'Rush',
      pricingMode: 'percent',
      percentage: '25',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ['pricingMode'],
        message: RATE_CATALOG_VALIDATION_MESSAGES.catalog.mode,
      });
    }
  });

  it.each(['flat', 'per_day'] as const)(
    'normalizes %s values into the monetary column only',
    (pricingMode) => {
      expect(
        addonRateItemInputSchema.parse({
          name: 'Extra',
          pricingMode,
          price: '12.34',
        }),
      ).toEqual({
        name: 'Extra',
        pricingMode,
        priceCents: 1_234,
        percentage: null,
        isActive: true,
      });
    },
  );

  it.each(['0', String(PERCENTAGE_MAX)])(
    'normalizes whole percentage %s into the percentage column only',
    (percentage) => {
      expect(
        addonRateItemInputSchema.parse({
          name: 'Rush',
          pricingMode: 'percentage',
          percentage,
        }),
      ).toEqual({
        name: 'Rush',
        pricingMode: 'percentage',
        priceCents: null,
        percentage: Number(percentage),
        isActive: true,
      });
    },
  );

  it.each(['-1', '+1', '12.5', '1e2', ''])(
    'rejects invalid percentage %j',
    (percentage) => {
      const result = addonRateItemInputSchema.safeParse({
        name: 'Rush',
        pricingMode: 'percentage',
        percentage,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({
          path: ['percentage'],
          message: RATE_CATALOG_VALIDATION_MESSAGES.catalog.percentage,
        });
      }
    },
  );

  it.each(['101', '2147483648', '9'.repeat(400)])(
    'rejects percentage %s above the approved maximum',
    (percentage) => {
      const result = addonRateItemInputSchema.safeParse({
        name: 'Rush',
        pricingMode: 'percentage',
        percentage,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          RATE_CATALOG_VALIDATION_MESSAGES.catalog.numericRange,
        );
      }
    },
  );

  it('requires the value belonging to the selected family', () => {
    expect(
      addonRateItemInputSchema.safeParse({
        name: 'Rush',
        pricingMode: 'percentage',
        price: '25',
      }).success,
    ).toBe(false);
    expect(
      addonRateItemInputSchema.safeParse({
        name: 'Rush',
        pricingMode: 'flat',
        percentage: '25',
      }).success,
    ).toBe(false);
  });
});
