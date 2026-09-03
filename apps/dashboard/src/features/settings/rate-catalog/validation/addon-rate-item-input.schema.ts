import { ADDON_PRICING_MODES } from '@inbox-triage/domain/rates';
import { z } from 'zod';
import { RATE_CATALOG_VALIDATION_MESSAGES } from './validation-messages';
import {
  activeSchema,
  catalogNameSchema,
  euroCentsSchema,
  percentageSchema,
} from './rate-item-fields';

export const addonPricingModeSchema = z.enum(ADDON_PRICING_MODES, {
  error: RATE_CATALOG_VALIDATION_MESSAGES.catalog.mode,
});

const monetaryAddonInputSchema = z.object({
  name: catalogNameSchema,
  pricingMode: z.enum(['flat', 'per_day']),
  price: euroCentsSchema,
  isActive: activeSchema,
});

const percentageAddonInputSchema = z.object({
  name: catalogNameSchema,
  pricingMode: z.literal('percentage'),
  percentage: percentageSchema,
  isActive: activeSchema,
});

export const addonRateItemInputSchema = z
  .discriminatedUnion(
    'pricingMode',
    [monetaryAddonInputSchema, percentageAddonInputSchema],
    { error: RATE_CATALOG_VALIDATION_MESSAGES.catalog.mode },
  )
  .transform((input) => {
    if (input.pricingMode === 'percentage') {
      return {
        name: input.name,
        pricingMode: input.pricingMode,
        priceCents: null,
        percentage: input.percentage,
        isActive: input.isActive,
      };
    }

    return {
      name: input.name,
      pricingMode: input.pricingMode,
      priceCents: input.price,
      percentage: null,
      isActive: input.isActive,
    };
  });

export type AddonRateItemField = KeysOfUnion<
  z.input<typeof addonRateItemInputSchema>
>;
export type AddonRateItemInput = z.output<typeof addonRateItemInputSchema>;

/** Distributes `keyof` across union members so branch-specific fields remain. */
type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never;
