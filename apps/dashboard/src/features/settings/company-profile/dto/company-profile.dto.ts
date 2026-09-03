import type { CompanyProfileInput } from '../validation/company-profile-input.schema';

export type CompanyProfileDto = CompanyProfileInput & {
  updatedAt: string | null;
};
