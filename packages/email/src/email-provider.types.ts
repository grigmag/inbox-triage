export type EmailProvider = 'zoho' | 'gmail';

/**
 * The provider and the server settings it needs. Gmail needs none because its
 * hosts are fixed in this package.
 */
export type EmailProviderConfig =
  | { provider: 'zoho'; imapHost: string; smtpHost: string }
  | { provider: 'gmail' };
