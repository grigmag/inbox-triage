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
import { timestamps } from './helpers/timestamps';

export const crewRateItems = pgTable(
  'crew_rate_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    dayRateCents: integer('day_rate_cents').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull(),
    ...timestamps(),
  },
  (table) => [
    check(
      'crew_rate_items_name_trimmed',
      sql`btrim(${table.name}) = ${table.name}`,
    ),
    check('crew_rate_items_name_not_empty', sql`${table.name} <> ''`),
    check(
      'crew_rate_items_day_rate_cents_non_negative',
      sql`${table.dayRateCents} >= 0`,
    ),
    check(
      'crew_rate_items_sort_order_non_negative',
      sql`${table.sortOrder} >= 0`,
    ),
    uniqueIndex('crew_rate_items_name_unique').on(sql`lower(${table.name})`),
  ],
);

export type CrewRateItem = typeof crewRateItems.$inferSelect;
