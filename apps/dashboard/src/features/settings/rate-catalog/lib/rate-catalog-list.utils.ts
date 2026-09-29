import type { AddonRateItemDto } from '../dto/addon-rate-item.dto';
import type { CrewRateItemDto } from '../dto/crew-rate-item.dto';
import type { DeliverableRateItemDto } from '../dto/deliverable-rate-item.dto';
import type { RateItemDto } from '../dto/rate-item.dto';

type OrderedItem = {
  id: string;
  sortOrder: number;
};

export function upsertCatalogItem<Item extends OrderedItem>(
  items: Item[],
  item: Item,
): Item[] {
  return [...items.filter(({ id }) => id !== item.id), item].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
}

export function replaceCatalogItem<Item extends { id: string }>(
  items: Item[],
  item: Item,
): Item[] {
  return items.map((current) => (current.id === item.id ? item : current));
}

export function isCrewRateItem(item: RateItemDto): item is CrewRateItemDto {
  return 'dayRateCents' in item;
}

export function isDeliverableRateItem(
  item: RateItemDto,
): item is DeliverableRateItemDto {
  return 'unitPriceCents' in item;
}

export function isAddonRateItem(item: RateItemDto): item is AddonRateItemDto {
  return 'percentage' in item;
}
