'use server';

import type { ActionResult } from '@/lib/actions/action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/server/actions/field-errors-from-zod';
import type { RateItemDto } from '../dto/rate-item.dto';
import { CatalogItemNotFoundError } from '../errors/catalog.errors';
import { rateCatalogRepository } from '../repositories/rate-catalog.repository';
import { CATALOG_SAVE_FAILURE } from './catalog-write-error-result';
import {
  setCatalogItemActiveInputSchema,
  type SetCatalogItemActiveInput,
} from '../validation/set-catalog-item-active-input.schema';

export async function setCatalogItemActiveAction(
  input: unknown,
): Promise<ActionResult<RateItemDto, keyof SetCatalogItemActiveInput>> {
  await requireUser();

  const parsed = setCatalogItemActiveInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<keyof SetCatalogItemActiveInput>(
        parsed.error,
      ),
    };
  }

  try {
    const { catalog, id, isActive } = parsed.data;

    const updatedRateItem = await rateCatalogRepository.setItemActive(
      catalog,
      id,
      isActive,
    );

    return {
      status: 'success',
      data: updatedRateItem,
      announcement: 'Availability updated.',
    };
  } catch (error) {
    if (error instanceof CatalogItemNotFoundError) {
      return { status: 'not_found', message: 'Catalog item was not found.' };
    }

    return { status: 'failure', message: CATALOG_SAVE_FAILURE };
  }
}
