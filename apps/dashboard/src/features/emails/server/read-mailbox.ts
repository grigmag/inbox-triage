import 'server-only';

import {
  createMailboxReader,
  MailboxReaderError,
  type MailboxReader,
  type MailboxReaderConfig,
} from '@inbox-triage/email';
import { emailConnectionRepository } from '@/features/settings/email-integration/repositories/email-connection.repository';
import { cryptoService } from '@/lib/crypto/crypto.service';

type MailboxRead<Data> =
  { status: 'success'; data: Data } | { status: 'noConnection' };

const RETRY_DELAY_MS = 500;

// Callers must authenticate and pass the local user ID from requireUser().
// Operations must be read-only because a transient failure runs them again.
export async function readMailbox<Data>(
  userId: string,
  operation: (reader: MailboxReader) => Promise<Data>,
): Promise<MailboxRead<Data>> {
  try {
    const connection = await emailConnectionRepository.findForUser(userId);

    if (!connection) {
      return { status: 'noConnection' };
    }

    const config: MailboxReaderConfig = {
      provider: connection.provider,
      imapHost: connection.imapHost,
      credentials: {
        username: connection.username,
        password: cryptoService.decryptSignedString(
          connection.encryptedPassword,
        ),
      },
    };

    const data = await runWithRetry(config, operation);
    return { status: 'success', data };
  } catch (error) {
    console.error(
      'Mailbox read failed.',
      error instanceof MailboxReaderError
        ? { code: error.code, ...error.diagnostic }
        : error,
    );
    throw error;
  }
}

async function runWithRetry<Data>(
  config: MailboxReaderConfig,
  operation: (reader: MailboxReader) => Promise<Data>,
): Promise<Data> {
  try {
    const data = await runOnce(config, operation);
    return data;
  } catch (error) {
    if (
      !(error instanceof MailboxReaderError) ||
      error.code !== 'CONNECTION_FAILED'
    ) {
      throw error;
    }
    console.warn('Retrying mailbox read after a transient failure.', {
      code: error.code,
      ...error.diagnostic,
    });
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return runOnce(config, operation);
  }
}

// Each attempt uses a new connection because a failed session may be unusable.
async function runOnce<Data>(
  config: MailboxReaderConfig,
  operation: (reader: MailboxReader) => Promise<Data>,
): Promise<Data> {
  const reader = createMailboxReader(config);

  try {
    const data = await operation(reader);
    return data;
  } finally {
    await reader.close();
  }
}
