import 'server-only';

import { cryptoService } from '@/lib/crypto/crypto.service';
import { emailConnectionRepository } from '../repositories/email-connection.repository';

type SaveEmailConnectionInput = {
  userId: string;
  provider: 'zoho';
  username: string;
  imapHost: string;
  smtpHost: string;
  password: string;
};

export type SaveEmailConnectionOutcome =
  'saved' | 'unchanged' | 'password_required';

// The caller supplies validated credentials and the authenticated local user ID.
export async function saveEmailConnectionUseCase(
  input: SaveEmailConnectionInput,
): Promise<SaveEmailConnectionOutcome> {
  const username = input.username.trim().toLowerCase();
  const imapHost = input.imapHost.trim();
  const smtpHost = input.smtpHost.trim();
  const existing = await emailConnectionRepository.findForUser(input.userId);

  if (!existing && input.password === '') {
    return 'password_required';
  }

  if (
    existing &&
    input.password === '' &&
    existing.username === username &&
    existing.imapHost === imapHost &&
    existing.smtpHost === smtpHost
  ) {
    return 'unchanged';
  }

  const encryptedPassword =
    input.password === ''
      ? existing?.encryptedPassword
      : cryptoService.encryptAndSignString(input.password);

  if (!encryptedPassword) {
    return 'password_required';
  }

  await emailConnectionRepository.saveForUser({
    userId: input.userId,
    provider: input.provider,
    username,
    imapHost,
    smtpHost,
    encryptedPassword,
  });

  return 'saved';
}
