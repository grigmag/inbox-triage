import 'server-only';

import type { Db } from '@inbox-triage/db/client';
import { companyProfile } from '@inbox-triage/db/schema';
import { db } from '@/server/db';
import type { CompanyProfileDto } from '../dto/company-profile.dto';
import type { CompanyProfileInput } from '../validation/company-profile-input.schema';

type Transaction = Parameters<Parameters<Db['transaction']>[0]>[0];

export type CompanyProfileRepositoryOptions = {
  tx?: Transaction;
};

const COMPANY_PROFILE_ID = '00000000-0000-4000-8000-000000000001';

const EMPTY_COMPANY_PROFILE_DTO = {
  legalName: null,
  taxId: null,
  taxOffice: null,
  address: null,
  postalCode: null,
  city: null,
  phone: null,
  email: null,
  iban: null,
  bankName: null,
  updatedAt: null,
} as const satisfies CompanyProfileDto;

const companyProfileSelection = {
  legalName: companyProfile.legalName,
  taxId: companyProfile.taxId,
  taxOffice: companyProfile.taxOffice,
  address: companyProfile.address,
  postalCode: companyProfile.postalCode,
  city: companyProfile.city,
  phone: companyProfile.phone,
  email: companyProfile.email,
  iban: companyProfile.iban,
  bankName: companyProfile.bankName,
  updatedAt: companyProfile.updatedAt,
};

class CompanyProfileRepository {
  constructor(private readonly database: Db) {}

  async get(
    options: CompanyProfileRepositoryOptions = {},
  ): Promise<CompanyProfileDto> {
    const [profile] = await (options.tx ?? this.database)
      .select(companyProfileSelection)
      .from(companyProfile)
      .limit(1);

    if (!profile) return { ...EMPTY_COMPANY_PROFILE_DTO };

    return {
      ...profile,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async save(
    input: CompanyProfileInput,
    options: CompanyProfileRepositoryOptions = {},
  ): Promise<CompanyProfileDto> {
    const [saved] = await (options.tx ?? this.database)
      .insert(companyProfile)
      .values({ id: COMPANY_PROFILE_ID, ...input })
      .onConflictDoUpdate({
        target: companyProfile.id,
        set: input,
      })
      .returning(companyProfileSelection);

    if (!saved) throw new Error('Company profile upsert returned no row.');

    return {
      ...saved,
      updatedAt: saved.updatedAt.toISOString(),
    };
  }
}

export const companyProfileRepository = new CompanyProfileRepository(db);
