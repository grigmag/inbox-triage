import { sql } from 'drizzle-orm';
import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './helpers/timestamps';

export const companyProfile = pgTable(
  'company_profile',
  {
    id: uuid('id').primaryKey(),
    name: text('name'),
    address: text('address'),
    postalCode: text('postal_code'),
    city: text('city'),
    phone: text('phone'),
    email: text('email'),
    ...timestamps(),
  },
  () => [uniqueIndex('company_profile_singleton').on(sql`(true)`)],
);

export type CompanyProfile = typeof companyProfile.$inferSelect;
