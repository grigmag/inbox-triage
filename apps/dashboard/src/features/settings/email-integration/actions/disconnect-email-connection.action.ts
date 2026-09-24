'use server';

import { revalidatePath } from 'next/cache';
import { routes } from '@/config/routes';
import type { MutationActionResult } from '@/lib/actions/mutation-action-result';
import { requireUser } from '@/server/auth';
import { emailConnectionRepository } from '../repositories/email-connection.repository';

const DISCONNECT_FAILURE_MESSAGE =
  'Unable to disconnect the email connection. Please try again.';

export type DisconnectEmailConnectionActionResult = MutationActionResult<null>;

export async function disconnectEmailConnectionAction(): Promise<DisconnectEmailConnectionActionResult> {
  const user = await requireUser();

  try {
    await emailConnectionRepository.deleteForUser(user.id);
  } catch {
    return { status: 'failure', message: DISCONNECT_FAILURE_MESSAGE };
  }

  revalidatePath(routes.settingsEmail);

  return {
    status: 'success',
    data: null,
    announcement: 'Email connection disconnected.',
  };
}
