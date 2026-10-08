import type { EmailConnectionSettingsDto } from '../dto/email-connection-settings.dto';
import type { EmailConnectionInput } from '../validation/email-connection-input.schema';

/**
 * What saving the form would do: nothing, create the first connection, update
 * the saved one, or replace a saved connection that uses another provider.
 */
export type EmailConnectionSaveKind = 'none' | 'create' | 'update' | 'replace';

/**
 * Compares parsed form input with the saved connection. An empty password
 * keeps the saved one, so it only counts as unchanged for the same provider.
 */
export function getEmailConnectionSaveKind(
  saved: EmailConnectionSettingsDto | null,
  input: EmailConnectionInput,
): EmailConnectionSaveKind {
  if (saved === null) return 'create';
  if (saved.provider !== input.provider) return 'replace';

  const hostsChanged =
    saved.provider === 'zoho' &&
    input.provider === 'zoho' &&
    (saved.imapHost !== input.imapHost || saved.smtpHost !== input.smtpHost);

  return input.password !== '' || hostsChanged || saved.username !== input.email
    ? 'update'
    : 'none';
}
