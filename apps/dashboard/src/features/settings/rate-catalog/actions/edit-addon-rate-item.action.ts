'use server';

import type { ActionResult } from '@/lib/actions/action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
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
import { catalogItemIdSchema } from '../validation/catalog.schema';

export async function editAddonRateItemAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<AddonRateItemDto, 'id' | AddonRateItemField>> {
  await requireUser();

  const parsedId = catalogItemIdSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      status: 'validation_error',
      fieldErrors: { id: 'Provide a valid catalog item ID.' },
    };
  }

  const parsed = addonRateItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<AddonRateItemField>(parsed.error),
    };
  }

  try {
    const updatedRateItem = await rateCatalogRepository.updateAddonItem(
      parsedId.data,
      parsed.data,
    );

    return {
      status: 'success',
      data: updatedRateItem,
      announcement: 'Add-on updated.',
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
