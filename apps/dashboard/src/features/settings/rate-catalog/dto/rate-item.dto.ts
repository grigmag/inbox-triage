import type { AddonRateItemDto } from './addon-rate-item.dto';
import type { CrewRateItemDto } from './crew-rate-item.dto';
import type { DeliverableRateItemDto } from './deliverable-rate-item.dto';

export type RateItemDto =
  CrewRateItemDto | DeliverableRateItemDto | AddonRateItemDto;
