import { z } from 'zod';
import { COMPANY_PROFILE_VALIDATION_MESSAGES } from './validation-messages';

export const COMPANY_PROFILE_FIELD_LIMITS = {
  name: 200,
  address: 300,
  postalCode: 32,
  city: 120,
  phone: 64,
  email: 254,
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
  name: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.name),
  address: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.address),
  postalCode: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.postalCode),
  city: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.city),
  phone: optionalCompanyField(COMPANY_PROFILE_FIELD_LIMITS.phone),
  email: optionalCompanyEmail,
});

export type CompanyProfileInput = z.output<typeof companyProfileInputSchema>;
