'use server';

import { requireUser } from '@/server/auth';
import { toEmailSummaryDto, type EmailSummaryDto } from '../dto/email.dto';
import { mailboxFailureMessage } from '../server/mailbox-failure-message';
import { readMailbox } from '../server/read-mailbox';
import type { MailboxResult } from './mailbox-action-result';

const LOAD_FAILURE_MESSAGE =
  'Unable to load emails. Please try again or check Email settings.';

export async function loadNewerInboxAction(
  ref: string,
): Promise<MailboxResult<EmailSummaryDto[]>> {
  const user = await requireUser();

  if (typeof ref !== 'string' || ref.length === 0) {
    return { status: 'failure', message: LOAD_FAILURE_MESSAGE };
  }

  try {
    const result = await readMailbox(user.id, async (reader) => {
      const messages = await reader.listInboxNewerThan(ref);
      return messages.map(toEmailSummaryDto);
    });
    return result;
  } catch (error) {
    return {
      status: 'failure',
      message: mailboxFailureMessage(error, LOAD_FAILURE_MESSAGE),
    };
  }
}
