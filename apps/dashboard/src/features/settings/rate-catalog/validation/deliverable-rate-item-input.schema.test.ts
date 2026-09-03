import {
  DELIVERABLE_PRICING_MODES,
  type DeliverablePricingMode,
} from '@inbox-triage/domain/rates';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { RATE_CATALOG_VALIDATION_MESSAGES } from './validation-messages';
import {
  deliverablePricingModeSchema,
  deliverableRateItemInputSchema,
} from './deliverable-rate-item-input.schema';

describe('deliverable rate item schemas', () => {
  it('derives the validation mode union from the shared values', () => {
    expectTypeOf<DeliverablePricingMode>().toEqualTypeOf<
      (typeof DELIVERABLE_PRICING_MODES)[number]
    >();
  });

  it.each(DELIVERABLE_PRICING_MODES)('accepts pricing mode %s', (mode) => {
    expect(deliverablePricingModeSchema.parse(mode)).toBe(mode);
  });

  it('rejects unsupported modes with exact copy', () => {
    const result = deliverablePricingModeSchema.safeParse('percent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        RATE_CATALOG_VALIDATION_MESSAGES.catalog.mode,
      );
    }
  });

  it('normalizes the input', () => {
    expect(
      deliverableRateItemInputSchema.parse({
        name: ' Reels ',
        pricingMode: 'per_unit',
        unitPrice: '350.00',
        isActive: false,
      }),
    ).toEqual({
      name: 'Reels',
      pricingMode: 'per_unit',
      unitPriceCents: 35_000,
      isActive: false,
    });
  });
});
