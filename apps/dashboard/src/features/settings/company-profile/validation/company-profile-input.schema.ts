import { z } from 'zod';
import { COMPANY_PROFILE_VALIDATION_MESSAGES } from './validation-messages';

export const COMPANY_PROFILE_FIELD_LIMITS = {
  legalName: 200,
  taxId: 64,
  taxOffice: 120,
  address: 300,
  postalCode: 32,
  city: 120,
  phone: 64,
  email: 254,
  iban: 64,
  bankName: 120,
} as const;

function optionalCompanyField(maximumLength: number) {
  return z
    .string()
    .trim()
    .max(maximumLength, COMPANY_PROFILE_VALIDATION_MESSAGES.tooLong)
    .transform((value) => (value === '' ? null : value));
}

const blankOrEmailSchema = z.union(
  [
    z.literal(''),
    z.email({ error: COMPANY_PROFILE_VALIDATION_MESSAGES.email }),
  ],
  { error: COMPANY_PROFILE_VALIDATION_MESSAGES.email },
);

const optionalCompanyEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(
    COMPANY_PROFILE_FIELD_LIMITS.email,
    COMPANY_PROFILE_VALIDATION_MESSAGES.tooLong,
  )
  .pipe(blankOrEmailSchema)
  .transform((value) => (value === '' ? null : value));

export const companyProfileInputSchema = z.object({
  legalName: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.legalName),
  taxId: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.taxId),
  taxOffice: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.taxOffice),
  address: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.address),
  postalCode: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.postalCode),
  city: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.city),
  phone: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.phone),
  email: optionalCompanyEmail,
  iban: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.iban),
  bankName: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.bankName),
});

export type CompanyProfileInput = z.output<typeof companyProfileInputSchema>;
