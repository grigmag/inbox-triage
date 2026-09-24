import type { z } from 'zod';
import type { FieldErrors } from '@/lib/actions/mutation-action-result';

/**
 * Keeps the first Zod message per top-level string field, optionally filtering
 * to allowedFields. Ignores root errors and paths without a string field name.
 */
export function fieldErrorsFromZod<Field extends string>(
  error: z.ZodError,
  allowedFields?: readonly Field[],
): FieldErrors<Field> {
  const fieldErrors: FieldErrors<Field> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === 'string' &&
      (allowedFields === undefined || allowedFields.includes(field as Field)) &&
      fieldErrors[field as Field] === undefined
    ) {
      fieldErrors[field as Field] = issue.message;
    }
  }

  return fieldErrors;
}
