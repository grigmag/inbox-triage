'use server';

import { revalidatePath } from 'next/cache';
import { routes } from '@/config/routes';
import type { MutationActionResult } from '@/lib/actions/mutation-action-result';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { requireUser } from '@/server/auth';
import {
  saveEmailConnectionUseCase,
  type SaveEmailConnectionOutcome,
} from '../use-cases/save-email-connection.use-case';
import {
  emailConnectionInputSchema,
  passwordRequiredMessage,
  type EmailConnectionInputField,
} from '../validation/email-connection-input.schema';

const SAVE_FAILURE_MESSAGE =
  'Unable to save the email connection. Please try again.';
const CREDENTIALS_REJECTED_MESSAGES = {
  zoho: 'Zoho rejected the password. Check the email and password.',
  gmail: 'Gmail rejected the app password. Check the steps below.',
} as const;
const SERVER_UNREACHABLE_MESSAGE = "Couldn't reach the mail server.";

export type SaveEmailConnectionActionResult = MutationActionResult<
  null,
  EmailConnectionInputField
>;

export async function saveEmailConnectionAction(
  input: unknown,
): Promise<SaveEmailConnectionActionResult> {
  const user = await requireUser();
  const parsed = emailConnectionInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: 'validation_error',
      fieldErrors: fieldErrorsFromZod<EmailConnectionInputField>(parsed.error),
    };
  }

  const { email, ...connection } = parsed.data;
  let outcome: SaveEmailConnectionOutcome;

  try {
    outcome = await saveEmailConnectionUseCase({
      userId: user.id,
      username: email,
      ...connection,
    });
  } catch {
    return { status: 'failure', message: SAVE_FAILURE_MESSAGE };
  }

  if (outcome === 'password_required') {
    return {
      status: 'validation_error',
      fieldErrors: {
        password: passwordRequiredMessage(connection.provider),
      },
    };
  }

  if (outcome === 'credentials_rejected') {
    return {
      status: 'validation_error',
      fieldErrors: {
        password: CREDENTIALS_REJECTED_MESSAGES[connection.provider],
      },
    };
  }

  if (outcome === 'server_unreachable') {
    return { status: 'failure', message: SERVER_UNREACHABLE_MESSAGE };
  }

  if (outcome === 'check_failed') {
    return { status: 'failure', message: SAVE_FAILURE_MESSAGE };
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
