'use server';

import { requireUser } from '@/server/auth';
import { toEmailMessageDto, type EmailMessageDto } from '../dto/email.dto';
import { readMailbox } from '../server/read-mailbox';
import type { MailboxResult } from './mailbox-action-result';

const LOAD_FAILURE_MESSAGE =
  'Unable to load emails. Please try again or check Email settings.';

export async function loadEmailMessageAction(
  ref: string,
): Promise<MailboxResult<EmailMessageDto>> {
  const user = await requireUser();

  if (typeof ref !== 'string' || ref.length === 0) {
    return { status: 'failure', message: LOAD_FAILURE_MESSAGE };
  }

  try {
    const result = await readMailbox(user.id, async (reader) => {
      const message = await reader.getMessage(ref);
      return toEmailMessageDto(message);
    });
    return result;
  } catch {
    return { status: 'failure', message: LOAD_FAILURE_MESSAGE };
  }
}
