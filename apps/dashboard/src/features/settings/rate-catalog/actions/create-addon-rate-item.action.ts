'use server';

import type { MutationActionResult } from '@/lib/actions/mutation-action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { db } from '@/server/db';
import type { AddonRateItemDto } from '../dto/addon-rate-item.dto';
import {
  CATALOG_SAVE_FAILURE,
  catalogWriteErrorResult,
} from './catalog-write-error-result';
import { rateCatalogRepository } from '../repositories/rate-catalog.repository';
import {
  addonRateItemInputSchema,
  type AddonRateItemField,
} from '../validation/addon-rate-item-input.schema';

export async function createAddonRateItemAction(
  input: unknown,
): Promise<MutationActionResult<AddonRateItemDto, AddonRateItemField>> {
  await requireUser();

  const parsed = addonRateItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<AddonRateItemField>(parsed.error),
    };
  }

  try {
    const createdRateItem = await db.transaction((tx) =>
      rateCatalogRepository.createAddonItem(parsed.data, { tx }),
    );

    return {
      status: 'success',
      data: createdRateItem,
      announcement: 'Add-on added.',
    };
  } catch (error) {
    return (
      catalogWriteErrorResult(error) ?? {
        status: 'failure',
        message: CATALOG_SAVE_FAILURE,
      }
    );
  }
}
