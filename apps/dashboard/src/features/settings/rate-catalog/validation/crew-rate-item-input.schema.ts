import { z } from 'zod';
import {
  activeSchema,
  catalogNameSchema,
  euroCentsSchema,
} from './rate-item-fields';

export const crewRateItemInputSchema = z
  .object({
    name: catalogNameSchema,
    dayRate: euroCentsSchema,
    isActive: activeSchema,
  })
  .transform((input) => ({
    name: input.name,
    dayRateCents: input.dayRate,
    isActive: input.isActive,
  }));

export type CrewRateItemField = keyof z.input<typeof crewRateItemInputSchema>;
export type CrewRateItemInput = z.output<typeof crewRateItemInputSchema>;
