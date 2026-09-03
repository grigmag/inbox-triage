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
import type { DeliverablePricingMode } from '@inbox-triage/domain/rates';
import { timestamps } from './helpers/timestamps';

export const deliverableRateItems = pgTable(
  'deliverable_rate_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    pricingMode: text('pricing_mode').$type<DeliverablePricingMode>().notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull(),
    ...timestamps(),
  },
  (table) => [
    check(
      'deliverable_rate_items_name_trimmed',
      sql`btrim(${table.name}) = ${table.name}`,
    ),
    check('deliverable_rate_items_name_not_empty', sql`${table.name} <> ''`),
    check(
      'deliverable_rate_items_pricing_mode',
      sql`${table.pricingMode} in ('per_unit', 'per_30')`,
    ),
    check(
      'deliverable_rate_items_unit_price_cents_non_negative',
      sql`${table.unitPriceCents} >= 0`,
    ),
    check(
      'deliverable_rate_items_sort_order_non_negative',
      sql`${table.sortOrder} >= 0`,
    ),
    uniqueIndex('deliverable_rate_items_name_unique').on(
      sql`lower(${table.name})`,
    ),
  ],
);

export type DeliverableRateItem = typeof deliverableRateItems.$inferSelect;
