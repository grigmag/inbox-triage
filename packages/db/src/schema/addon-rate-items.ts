import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AddonPricingMode } from '@inbox-triage/domain/rates';
import { timestamps } from './helpers/timestamps';

export const addonRateItems = pgTable(
  'addon_rate_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    pricingMode: text('pricing_mode').$type<AddonPricingMode>().notNull(),
    priceCents: integer('price_cents'),
    percentage: integer('percentage'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull(),
    ...timestamps(),
  },
  (table) => [
    check(
      'addon_rate_items_name_trimmed',
      sql`btrim(${table.name}) = ${table.name}`,
    ),
    check('addon_rate_items_name_not_empty', sql`${table.name} <> ''`),
    check(
      'addon_rate_items_pricing_mode',
      sql`${table.pricingMode} in ('flat', 'per_day', 'percentage')`,
    ),
    check(
      'addon_rate_items_price_cents_non_negative',
      sql`${table.priceCents} is null or ${table.priceCents} >= 0`,
    ),
    check(
      'addon_rate_items_percentage_non_negative',
      sql`${table.percentage} is null or ${table.percentage} >= 0`,
    ),
    check(
      'addon_rate_items_value_columns',
      sql`(${table.pricingMode} in ('flat', 'per_day') and ${table.priceCents} is not null and ${table.percentage} is null) or (${table.pricingMode} = 'percentage' and ${table.priceCents} is null and ${table.percentage} is not null)`,
    ),
    check(
      'addon_rate_items_sort_order_non_negative',
      sql`${table.sortOrder} >= 0`,
    ),
    uniqueIndex('addon_rate_items_name_unique').on(sql`lower(${table.name})`),
  ],
);

export type AddonRateItem = typeof addonRateItems.$inferSelect;
