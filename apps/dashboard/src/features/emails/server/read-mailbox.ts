import 'server-only';

import { createEmailClient, type EmailClient } from '@inbox-triage/email';
import { emailConnectionRepository } from '@/features/settings/email-integration/repositories/email-connection.repository';
import { cryptoService } from '@/lib/crypto/crypto.service';

type MailboxRead<Data> =
  { status: 'success'; data: Data } | { status: 'noConnection' };

// Callers must authenticate and pass the local user ID from requireUser().
export async function readMailbox<Data>(
  userId: string,
  operation: (client: EmailClient) => Promise<Data>,
): Promise<MailboxRead<Data>> {
  const connection = await emailConnectionRepository.findForUser(userId);

  if (!connection) {
    return { status: 'noConnection' };
  }

  const client = createEmailClient({
    provider: connection.provider,
    imapHost: connection.imapHost,
    credentials: {
      username: connection.username,
      password: cryptoService.decryptSignedString(connection.encryptedPassword),
    },
  });

  try {
    return { status: 'success', data: await operation(client) };
  } finally {
    await client.close();
  }
}
