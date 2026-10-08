import 'server-only';

import type {
  EmailConnectionCheckConfig,
  EmailCredentials,
} from '@inbox-triage/email';
import { emailConnectionRepository } from '@/features/settings/email-integration/repositories/email-connection.repository';
import { cryptoService } from '@/lib/crypto/crypto.service';

// The provider, hosts, and credentials, in the shape checkEmailConnection() takes.
type EmailConnectionConfig = EmailConnectionCheckConfig;

// Callers must authenticate and pass the local user ID from requireUser().
// The result contains the decrypted password and must stay in server code.
export async function loadEmailConnection(
  userId: string,
): Promise<EmailConnectionConfig | null> {
  const connection = await emailConnectionRepository.findForUser(userId);

  if (!connection) {
    return null;
  }

  const { username, encryptedPassword, ...providerConfig } = connection;
  const credentials: EmailCredentials = {
    username,
    password: cryptoService.decryptSignedString(encryptedPassword),
  };

  return { ...providerConfig, credentials };
}
