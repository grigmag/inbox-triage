'use server';

import type { MutationActionResult } from '@/lib/actions/mutation-action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { revalidatePath } from 'next/cache';
import { routes } from '@/config/routes';
import type { CompanyProfileDto } from '../dto/company-profile.dto';
import { companyProfileRepository } from '../repositories/company-profile.repository';
import {
  companyProfileInputSchema,
  type CompanyProfileInput,
} from '../validation/company-profile-input.schema';

export async function saveCompanyProfileAction(
  input: unknown,
): Promise<MutationActionResult<CompanyProfileDto, keyof CompanyProfileInput>> {
  await requireUser();

  const parsed = companyProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<keyof CompanyProfileInput>(parsed.error),
    };
  }

  try {
    const data = await companyProfileRepository.save(parsed.data);
    revalidatePath(routes.settingsCompany);
    return { status: 'success', data, announcement: 'Αποθηκεύτηκε.' };
  } catch {
    return {
      status: 'failure',
      message: 'Δεν ήταν δυνατή η αποθήκευση. Δοκιμάστε ξανά.',
    };
  }
}
