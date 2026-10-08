import type {
  EmailConnectionCheck,
  EmailConnectionCheckConfig,
  EmailConnectionCheckFailureReason,
} from './email-connection-check.types';
import {
  createImapTransport,
  createSmtpTransport,
} from './create-mail-transports';
import type { EmailSenderErrorCode } from './email-sender-error';
import { GMAIL_IMAP_HOST, GMAIL_SMTP_HOST } from './gmail/gmail-hosts';
import type { ImapTransport } from './imap/imap-transport.types';
import { translateImapError } from './imap/translate-imap-error';
import type { MailboxReaderErrorCode } from './mailbox-reader-error';
import type { SmtpTransport } from './smtp/smtp-transport.types';
import { translateSmtpError } from './smtp/translate-smtp-error';

/**
 * Logs in over IMAP and logs out, then verifies the SMTP login without
 * sending anything. Provider failures resolve as a reason that carries no
 * provider text or credentials. The transports' connection and socket
 * timeouts bound how long the check can take.
 */
export async function checkEmailConnection(
  config: EmailConnectionCheckConfig,
): Promise<EmailConnectionCheck> {
  const { imapHost, smtpHost } =
    config.provider === 'gmail'
      ? { imapHost: GMAIL_IMAP_HOST, smtpHost: GMAIL_SMTP_HOST }
      : config;

  const imapFailure = await checkImapLogin(
    createImapTransport(imapHost, config.credentials),
  );
  if (imapFailure) {
    return { status: 'failed', reason: imapFailure };
  }

  const smtpFailure = await checkSmtpLogin(
    createSmtpTransport(smtpHost, config.credentials),
  );
  if (smtpFailure) {
    return { status: 'failed', reason: smtpFailure };
  }

  return { status: 'verified' };
}

async function checkImapLogin(
  transport: ImapTransport,
): Promise<EmailConnectionCheckFailureReason | null> {
  try {
    await transport.connect();
  } catch (error) {
    forceCloseImap(transport);
    return failureReason(translateImapError(error).code);
  }

  // The login already succeeded, so a failed logout only needs cleanup.
  try {
    await transport.logout();
  } catch {
    forceCloseImap(transport);
  }
  return null;
}

async function checkSmtpLogin(
  transport: SmtpTransport,
): Promise<EmailConnectionCheckFailureReason | null> {
  try {
    await transport.verify();
    return null;
  } catch (error) {
    return failureReason(translateSmtpError(error).code);
  } finally {
    try {
      transport.close();
    } catch {
      // Nodemailer's unpooled verify closes its own socket before rejecting.
      // Transport cleanup must not replace the check result.
    }
  }
}

function forceCloseImap(transport: ImapTransport): void {
  try {
    transport.forceClose();
  } catch {
    // The connection may already be gone.
  }
}

function failureReason(
  code: MailboxReaderErrorCode | EmailSenderErrorCode,
): EmailConnectionCheckFailureReason {
  if (code === 'AUTHENTICATION_FAILED') {
    return 'authentication';
  }
  if (code === 'CONNECTION_FAILED') {
    return 'connection';
  }
  return 'unknown';
}
