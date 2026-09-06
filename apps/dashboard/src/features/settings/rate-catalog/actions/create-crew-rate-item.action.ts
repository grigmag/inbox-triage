'use server';

import type { ActionResult } from '@/lib/actions/action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { db } from '@/server/db';
import type { CrewRateItemDto } from '../dto/crew-rate-item.dto';
import {
  CATALOG_SAVE_FAILURE,
  catalogWriteErrorResult,
} from './catalog-write-error-result';
import { rateCatalogRepository } from '../repositories/rate-catalog.repository';
import {
  crewRateItemInputSchema,
  type CrewRateItemField,
} from '../validation/crew-rate-item-input.schema';

export async function createCrewRateItemAction(
  input: unknown,
): Promise<ActionResult<CrewRateItemDto, CrewRateItemField>> {
  await requireUser();

  const parsed = crewRateItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<CrewRateItemField>(parsed.error),
    };
  }

  try {
    const createdRateItem = await db.transaction((tx) =>
      rateCatalogRepository.createCrewItem(parsed.data, { tx }),
    );

    return {
      status: 'success',
      data: createdRateItem,
      announcement: 'Crew role added.',
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
