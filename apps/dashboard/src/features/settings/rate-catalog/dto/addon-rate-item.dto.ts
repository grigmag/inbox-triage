import type { AddonRateItem } from '@inbox-triage/db/schema';
import type { AddonRateItemInput } from '../validation/addon-rate-item-input.schema';

export type AddonRateItemDto = AddonRateItemInput & {
  id: string;
  sortOrder: number;
};

export type AddonRow = Pick<
  AddonRateItem,
  | 'id'
  | 'name'
  | 'pricingMode'
  | 'priceCents'
  | 'percentage'
  | 'isActive'
  | 'sortOrder'
>;

export function toAddonRateItemDto(row: AddonRow): AddonRateItemDto {
  if (row.pricingMode === 'percentage' && row.percentage !== null) {
    return {
      ...row,
      pricingMode: 'percentage',
      priceCents: null,
      percentage: row.percentage,
    };
  }

  if (row.pricingMode !== 'percentage' && row.priceCents !== null) {
    return {
      ...row,
      pricingMode: row.pricingMode,
      priceCents: row.priceCents,
      percentage: null,
    };
  }

  throw new Error('Stored add-on has an invalid pricing value combination.');
}
