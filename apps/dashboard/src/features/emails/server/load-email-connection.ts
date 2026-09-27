import 'server-only';

import type { EmailCredentials } from '@inbox-triage/email';
import { emailConnectionRepository } from '@/features/settings/email-integration/repositories/email-connection.repository';
import { cryptoService } from '@/lib/crypto/crypto.service';

type EmailConnectionConfig = {
  provider: 'zoho';
  imapHost: string;
  smtpHost: string;
  credentials: EmailCredentials;
};

// Callers must authenticate and pass the local user ID from requireUser().
// The result contains the decrypted password and must stay in server code.
export async function loadEmailConnection(
  userId: string,
): Promise<EmailConnectionConfig | null> {
  const connection = await emailConnectionRepository.findForUser(userId);

  if (!connection) {
    return null;
  }

  return {
    provider: connection.provider,
    imapHost: connection.imapHost,
    smtpHost: connection.smtpHost,
    credentials: {
      username: connection.username,
      password: cryptoService.decryptSignedString(connection.encryptedPassword),
    },
  };
}
