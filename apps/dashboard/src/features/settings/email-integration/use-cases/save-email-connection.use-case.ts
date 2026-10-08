import 'server-only';

import {
  checkEmailConnection,
  type EmailConnectionCheckFailureReason,
  type EmailProviderConfig,
} from '@inbox-triage/email';
import { cryptoService } from '@/lib/crypto/crypto.service';
import { emailConnectionRepository } from '../repositories/email-connection.repository';

type SaveEmailConnectionInput = EmailProviderConfig & {
  userId: string;
  username: string;
  password: string;
};

/**
 * `credentials_rejected`, `server_unreachable`, and `check_failed` mean the
 * provider check failed and nothing was saved.
 */
export type SaveEmailConnectionOutcome =
  | 'saved'
  | 'unchanged'
  | 'password_required'
  | 'credentials_rejected'
  | 'server_unreachable'
  | 'check_failed';

const CHECK_FAILURE_OUTCOMES: Record<
  EmailConnectionCheckFailureReason,
  SaveEmailConnectionOutcome
> = {
  authentication: 'credentials_rejected',
  connection: 'server_unreachable',
  unknown: 'check_failed',
};

// The caller supplies validated credentials and the authenticated local user ID.
export async function saveEmailConnectionUseCase(
  input: SaveEmailConnectionInput,
): Promise<SaveEmailConnectionOutcome> {
  const username = input.username.trim().toLowerCase();
  const providerConfig: EmailProviderConfig =
    input.provider === 'zoho'
      ? {
          provider: input.provider,
          imapHost: input.imapHost.trim(),
          smtpHost: input.smtpHost.trim(),
        }
      : { provider: input.provider };
  const existing = await emailConnectionRepository.findForUser(input.userId);
  let password = input.password;
  let encryptedPassword: string | undefined;

  // A blank password keeps the saved one, but only for the same provider: a
  // saved password is never reused for another provider.
  if (password === '') {
    if (existing?.provider !== input.provider) {
      return 'password_required';
    }

    if (
      existing.username === username &&
      (existing.provider === 'gmail' ||
        (providerConfig.provider === 'zoho' &&
          existing.imapHost === providerConfig.imapHost &&
          existing.smtpHost === providerConfig.smtpHost))
    ) {
      return 'unchanged';
    }

    encryptedPassword = existing.encryptedPassword;
    password = cryptoService.decryptSignedString(encryptedPassword);
  }

  const check = await checkEmailConnection({
    ...providerConfig,
    credentials: { username, password },
  });

  if (check.status === 'failed') {
    return CHECK_FAILURE_OUTCOMES[check.reason];
  }

  encryptedPassword ??= cryptoService.encryptAndSignString(password);

  await emailConnectionRepository.saveForUser({
    userId: input.userId,
    username,
    encryptedPassword,
    ...providerConfig,
  });

  return 'saved';
}
