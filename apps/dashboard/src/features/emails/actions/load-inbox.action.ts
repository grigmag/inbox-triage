'use server';

import { requireUser } from '@/server/auth';
import { toEmailSummaryDto, type EmailPageDto } from '../dto/email.dto';
import { readMailbox } from '../server/read-mailbox';
import type { MailboxResult } from './mailbox-action-result';

const LOAD_FAILURE_MESSAGE =
  'Unable to load emails. Please try again or check Email settings.';

export async function loadInboxAction(): Promise<MailboxResult<EmailPageDto>> {
  const user = await requireUser();

  try {
    const result = await readMailbox(user.id, async (reader) => {
      const page = await reader.listInbox({ limit: 20 });
      return {
        messages: page.messages.map(toEmailSummaryDto),
        nextPageToken: page.nextPageToken,
      };
    });
    return result;
  } catch {
    return { status: 'failure', message: LOAD_FAILURE_MESSAGE };
  }
}
