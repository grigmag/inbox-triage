'use server';

import type { ActionResult } from '@/lib/actions/action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/server/actions/field-errors-from-zod';
import type { CompanyProfileDto } from '../dto/company-profile.dto';
import { companyProfileRepository } from '../repositories/company-profile.repository';
import {
  companyProfileInputSchema,
  type CompanyProfileInput,
} from '../validation/company-profile-input.schema';

export async function saveCompanyProfileAction(
  input: unknown,
): Promise<ActionResult<CompanyProfileDto, keyof CompanyProfileInput>> {
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
    return { status: 'success', data, announcement: 'Αποθηκεύτηκε.' };
  } catch {
    return { status: 'failure', message: 'Could not save business details.' };
  }
}
