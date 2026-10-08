import type { EmailProviderConfig } from '@inbox-triage/email';

export type EmailConnectionSettingsDto = EmailProviderConfig & {
  username: string;
};

// The stored connection contains the encrypted password; the DTO keeps only
// display fields.
export function toEmailConnectionSettingsDto(
  connection: EmailConnectionSettingsDto,
): EmailConnectionSettingsDto {
  const { username } = connection;

  return connection.provider === 'zoho'
    ? {
        provider: 'zoho',
        imapHost: connection.imapHost,
        smtpHost: connection.smtpHost,
        username,
      }
    : { provider: 'gmail', username };
}
