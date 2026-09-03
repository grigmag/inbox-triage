import { DELIVERABLE_PRICING_MODES } from '@inbox-triage/domain/rates';
import { z } from 'zod';
import { RATE_CATALOG_VALIDATION_MESSAGES } from './validation-messages';
import {
  activeSchema,
  catalogNameSchema,
  euroCentsSchema,
} from './rate-item-fields';

export const deliverablePricingModeSchema = z.enum(DELIVERABLE_PRICING_MODES, {
  error: RATE_CATALOG_VALIDATION_MESSAGES.catalog.mode,
});

export const deliverableRateItemInputSchema = z
  .object({
    name: catalogNameSchema,
    pricingMode: deliverablePricingModeSchema,
    unitPrice: euroCentsSchema,
    isActive: activeSchema,
  })
  .transform((input) => ({
    name: input.name,
    pricingMode: input.pricingMode,
    unitPriceCents: input.unitPrice,
    isActive: input.isActive,
  }));

export type DeliverableRateItemField = keyof z.input<
  typeof deliverableRateItemInputSchema
>;
export type DeliverableRateItemInput = z.output<
  typeof deliverableRateItemInputSchema
>;
