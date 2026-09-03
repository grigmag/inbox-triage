import type { CrewRateItemInput } from '../validation/crew-rate-item-input.schema';

export type CrewRateItemDto = CrewRateItemInput & {
  id: string;
  sortOrder: number;
};
