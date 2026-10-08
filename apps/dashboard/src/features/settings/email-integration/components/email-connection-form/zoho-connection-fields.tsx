import { ConnectionHostField } from './connection-host-field';
import { ConnectionPasswordField } from './connection-password-field';
import type { ProviderConnectionFieldsProps } from './email-connection-form.types';

export function ZohoConnectionFields({
  values,
  fieldErrors,
  disabled,
  hasSavedPassword,
  onChange,
}: ProviderConnectionFieldsProps) {
  return (
    <>
      <ConnectionHostField
        id="email-connection-imap-host"
        name="imapHost"
        label="IMAP host"
        value={values.imapHost}
        error={fieldErrors.imapHost}
        disabled={disabled}
        onChange={(value) => onChange('imapHost', value)}
      >
        <span>
          In Zoho Mail, open Settings, Mail Accounts, your mailbox, then Server
          Configuration Details. Copy the incoming IMAP server. InboxTriage uses
          port 993 with TLS.{' '}
        </span>

        <a
          href="https://www.zoho.com/mail/help/imap-access.html"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Zoho IMAP configuration guide
        </a>
      </ConnectionHostField>

      <ConnectionHostField
        id="email-connection-smtp-host"
        name="smtpHost"
        label="SMTP host"
        value={values.smtpHost}
        error={fieldErrors.smtpHost}
        disabled={disabled}
        onChange={(value) => onChange('smtpHost', value)}
      >
        <span>
          Copy the outgoing SMTP server from the same Zoho Server Configuration
          Details page. InboxTriage uses port 465 with TLS.{' '}
        </span>

        <a
          href="https://www.zoho.com/mail/help/zoho-smtp.html"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Zoho SMTP configuration guide
        </a>
      </ConnectionHostField>

      <ConnectionPasswordField
        label="Password"
        value={values.password}
        error={fieldErrors.password}
        disabled={disabled}
        hasSavedPassword={hasSavedPassword}
        onChange={(value) => onChange('password', value)}
      >
        {hasSavedPassword
          ? 'Password saved. Enter a new password to replace it.'
          : 'Use the password Zoho accepts for IMAP and SMTP.'}
      </ConnectionPasswordField>
    </>
  );
}
