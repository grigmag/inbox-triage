'use server';

import { revalidatePath } from 'next/cache';
import { routes } from '@/config/routes';
import type { ActionResult } from '@/lib/actions/action-result';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { requireUser } from '@/server/auth';
import {
  saveEmailConnectionUseCase,
  type SaveEmailConnectionOutcome,
} from '../use-cases/save-email-connection.use-case';
import {
  EMAIL_CONNECTION_VALIDATION_MESSAGES,
  emailConnectionInputSchema,
  type EmailConnectionInput,
} from '../validation/email-connection-input.schema';

const SAVE_FAILURE_MESSAGE =
  'Unable to save the email connection. Please try again.';

export type SaveEmailConnectionActionResult = ActionResult<
  null,
  keyof EmailConnectionInput
>;

export async function saveEmailConnectionAction(
  input: unknown,
): Promise<SaveEmailConnectionActionResult> {
  const user = await requireUser();
  const parsed = emailConnectionInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<keyof EmailConnectionInput>(parsed.error),
    };
  }

  let outcome: SaveEmailConnectionOutcome;

  try {
    outcome = await saveEmailConnectionUseCase({
      userId: user.id,
      provider: 'zoho',
      username: parsed.data.email,
      imapHost: parsed.data.imapHost,
      password: parsed.data.password,
    });
  } catch {
    return { status: 'failure', message: SAVE_FAILURE_MESSAGE };
  }

  if (outcome === 'password_required') {
    return {
      status: 'validation_error',
      fieldErrors: {
        password: EMAIL_CONNECTION_VALIDATION_MESSAGES.passwordRequired,
      },
    };
  }

  revalidatePath(routes.settingsEmail);

  return {
    status: 'success',
    data: null,
    announcement:
      outcome === 'unchanged'
        ? 'Email connection is already up to date.'
        : 'Email connection saved.',
  };
}
