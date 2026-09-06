'use server';

import type { ActionResult } from '@/lib/actions/action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import type { CrewRateItemDto } from '../dto/crew-rate-item.dto';
import {
  CATALOG_SAVE_FAILURE,
  catalogWriteErrorResult,
} from './catalog-write-error-result';
import { rateCatalogRepository } from '../repositories/rate-catalog.repository';
import { catalogItemIdSchema } from '../validation/catalog.schema';
import {
  crewRateItemInputSchema,
  type CrewRateItemField,
} from '../validation/crew-rate-item-input.schema';

export async function editCrewRateItemAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<CrewRateItemDto, 'id' | CrewRateItemField>> {
  await requireUser();

  const parsedId = catalogItemIdSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      status: 'validation_error',
      fieldErrors: { id: 'Provide a valid catalog item ID.' },
    };
  }

  const parsed = crewRateItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<CrewRateItemField>(parsed.error),
    };
  }

  try {
    const updatedRateItem = await rateCatalogRepository.updateCrewItem(
      parsedId.data,
      parsed.data,
    );

    return {
      status: 'success',
      data: updatedRateItem,
      announcement: 'Crew role updated.',
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
