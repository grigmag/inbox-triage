import 'server-only';

export { createMailboxReader } from './create-mailbox-reader';
export { createEmailSender } from './create-email-sender';
export { checkEmailConnection } from './check-email-connection';
export { EmailSenderError } from './email-sender-error';
export type { EmailSenderErrorCode } from './email-sender-error';
export { MailboxReaderError } from './mailbox-reader-error';
export type {
  MailboxReaderErrorCode,
  MailboxReaderErrorDiagnostic,
} from './mailbox-reader-error';
export type { EmailCredentials } from './email-credentials.types';
export type {
  EmailProvider,
  EmailProviderConfig,
} from './email-provider.types';
export type {
  EmailConnectionCheck,
  EmailConnectionCheckConfig,
  EmailConnectionCheckFailureReason,
} from './email-connection-check.types';
export type {
  EmailSender,
  EmailSenderConfig,
  ReplyEmailInput,
  ReplyEmailResult,
  SendEmailInput,
  SendEmailResult,
} from './email-sender.types';
export type {
  MailboxReader,
  MailboxReaderConfig,
  EmailPage,
  ListInboxOptions,
} from './mailbox-reader.types';
export type {
  EmailAddress,
  EmailMessage,
  EmailSummary,
  MessageRef,
} from './email-message.types';
