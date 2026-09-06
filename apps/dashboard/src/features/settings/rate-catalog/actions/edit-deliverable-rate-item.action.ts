'use server';

import type { ActionResult } from '@/lib/actions/action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import type { DeliverableRateItemDto } from '../dto/deliverable-rate-item.dto';
import {
  CATALOG_SAVE_FAILURE,
  catalogWriteErrorResult,
} from './catalog-write-error-result';
import { rateCatalogRepository } from '../repositories/rate-catalog.repository';
import { catalogItemIdSchema } from '../validation/catalog.schema';
import {
  deliverableRateItemInputSchema,
  type DeliverableRateItemField,
} from '../validation/deliverable-rate-item-input.schema';

export async function editDeliverableRateItemAction(
  id: unknown,
  input: unknown,
): Promise<
  ActionResult<DeliverableRateItemDto, 'id' | DeliverableRateItemField>
> {
  await requireUser();

  const parsedId = catalogItemIdSchema.safeParse(id);
  if (!parsedId.success) {
    return {
      status: 'validation_error',
      fieldErrors: { id: 'Provide a valid catalog item ID.' },
    };
  }

  const parsed = deliverableRateItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<DeliverableRateItemField>(parsed.error),
    };
  }

  try {
    const updatedRateItem = await rateCatalogRepository.updateDeliverableItem(
      parsedId.data,
      parsed.data,
    );

    return {
      status: 'success',
      data: updatedRateItem,
      announcement: 'Deliverable updated.',
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
