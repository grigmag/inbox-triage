'use server';

import type { ActionResult } from '@/lib/actions/action-result';
import { requireUser } from '@/server/auth';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import type { RateItemDto } from '../dto/rate-item.dto';
import {
  CatalogReorderConflictError,
  reorderCatalogUseCase,
} from '../use-cases/reorder-catalog.use-case';
import {
  reorderCatalogInputSchema,
  type ReorderCatalogInput,
} from '../validation/reorder-catalog-input.schema';

export async function reorderCatalogAction(
  input: unknown,
): Promise<ActionResult<readonly RateItemDto[], keyof ReorderCatalogInput>> {
  await requireUser();

  const parsed = reorderCatalogInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<keyof ReorderCatalogInput>(parsed.error),
    };
  }

  try {
    const reorderedRateItems = await reorderCatalogUseCase(parsed.data);

    return {
      status: 'success',
      data: reorderedRateItems,
      announcement: 'Order updated.',
    };
  } catch (error) {
    if (error instanceof CatalogReorderConflictError) {
      return {
        status: 'conflict',
        message: 'The catalog changed. Reload the saved order and try again.',
      };
    }

    return {
      status: 'failure',
      message: 'Could not reorder the catalog. The saved order is unchanged.',
    };
  }
}
