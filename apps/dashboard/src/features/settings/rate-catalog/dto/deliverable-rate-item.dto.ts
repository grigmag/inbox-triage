import type { DeliverableRateItemInput } from '../validation/deliverable-rate-item-input.schema';

export type DeliverableRateItemDto = DeliverableRateItemInput & {
  id: string;
  sortOrder: number;
};
