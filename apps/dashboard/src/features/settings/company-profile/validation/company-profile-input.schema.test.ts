import { describe, expect, it } from 'vitest';
import {
  COMPANY_PROFILE_FIELD_LIMITS,
  companyProfileInputSchema,
} from './company-profile-input.schema';
import { COMPANY_PROFILE_VALIDATION_MESSAGES } from './validation-messages';

const emptyCompanyProfile = {
  legalName: '',
  taxId: '',
  taxOffice: '',
  address: '',
  postalCode: '',
  city: '',
  phone: '',
  email: '',
  iban: '',
  bankName: '',
};

const maximumLengthEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(
  63,
)}.${'d'.repeat(61)}`;

describe('companyProfileInputSchema', () => {
  it('trims values, maps blanks to null, and lowercases email', () => {
    expect(
      companyProfileInputSchema.parse({
        ...emptyCompanyProfile,
        legalName: '  Northlight Studio  ',
        phone: '   ',
        email: '  STUDIO@Example.COM ',
      }),
    ).toEqual({
      legalName: 'Northlight Studio',
      taxId: null,
      taxOffice: null,
      address: null,
      postalCode: null,
      city: null,
      phone: null,
      email: 'studio@example.com',
      iban: null,
      bankName: null,
    });
  });

  it.each(Object.entries(COMPANY_PROFILE_FIELD_LIMITS))(
    'accepts %s at its approved %i-character boundary',
    (field, maximumLength) => {
      const result = companyProfileInputSchema.safeParse({
        ...emptyCompanyProfile,
        [field]:
          field === 'email' ? maximumLengthEmail : 'a'.repeat(maximumLength),
      });

      expect(result.success).toBe(true);
    },
  );

  it.each(Object.entries(COMPANY_PROFILE_FIELD_LIMITS))(
    'uses the exact maximum-length copy for %s',
    (field, maximumLength) => {
      const result = companyProfileInputSchema.safeParse({
        ...emptyCompanyProfile,
        [field]: 'a'.repeat(maximumLength + 1),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({
          path: [field],
          message: COMPANY_PROFILE_VALIDATION_MESSAGES.tooLong,
        });
      }
    },
  );

  it('uses the exact invalid-email copy', () => {
    const result = companyProfileInputSchema.safeParse({
      ...emptyCompanyProfile,
      email: 'not-an-email',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ['email'],
        message: COMPANY_PROFILE_VALIDATION_MESSAGES.email,
      });
    }
  });
});
