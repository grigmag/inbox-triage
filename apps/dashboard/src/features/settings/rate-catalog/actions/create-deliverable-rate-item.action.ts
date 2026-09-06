'use server';

import type { ActionResult } from '@/lib/actions/action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { db } from '@/server/db';
import type { DeliverableRateItemDto } from '../dto/deliverable-rate-item.dto';
import {
  CATALOG_SAVE_FAILURE,
  catalogWriteErrorResult,
} from './catalog-write-error-result';
import { rateCatalogRepository } from '../repositories/rate-catalog.repository';
import {
  deliverableRateItemInputSchema,
  type DeliverableRateItemField,
} from '../validation/deliverable-rate-item-input.schema';

export async function createDeliverableRateItemAction(
  input: unknown,
): Promise<ActionResult<DeliverableRateItemDto, DeliverableRateItemField>> {
  await requireUser();

  const parsed = deliverableRateItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<DeliverableRateItemField>(parsed.error),
    };
  }

  try {
    const createdRateItem = await db.transaction((tx) =>
      rateCatalogRepository.createDeliverableItem(parsed.data, { tx }),
    );

    return {
      status: 'success',
      data: createdRateItem,
      announcement: 'Deliverable added.',
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
