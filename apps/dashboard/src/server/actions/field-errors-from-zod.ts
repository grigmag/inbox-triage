import type { z } from 'zod';
import type { FieldErrors } from '@/lib/actions/action-result';

export function fieldErrorsFromZod<Field extends string>(
  error: z.ZodError,
): FieldErrors<Field> {
  const fieldErrors: FieldErrors<Field> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === 'string' &&
      fieldErrors[field as Field] === undefined
    ) {
      fieldErrors[field as Field] = issue.message;
    }
  }

  return fieldErrors;
}
