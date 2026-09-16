import 'server-only';

export { createEmailClient } from './create-email-client';
export { EmailClientError } from './email-client-error';
export type { EmailClientErrorCode } from './email-client-error';
export type {
  EmailClient,
  EmailClientConfig,
  EmailPage,
  ListInboxOptions,
} from './email-client.types';
export type {
  EmailAddress,
  EmailMessage,
  EmailSummary,
  MessageRef,
} from './email-message.types';
