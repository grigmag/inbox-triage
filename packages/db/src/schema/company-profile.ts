import { sql } from 'drizzle-orm';
import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './helpers/timestamps';

export const companyProfile = pgTable(
  'company_profile',
  {
    id: uuid('id').primaryKey(),
    legalName: text('legal_name'),
    taxId: text('tax_id'),
    taxOffice: text('tax_office'),
    address: text('address'),
    postalCode: text('postal_code'),
    city: text('city'),
    phone: text('phone'),
    email: text('email'),
    iban: text('iban'),
    bankName: text('bank_name'),
    ...timestamps(),
  },
  () => [uniqueIndex('company_profile_singleton').on(sql`(true)`)],
);

export type CompanyProfile = typeof companyProfile.$inferSelect;
