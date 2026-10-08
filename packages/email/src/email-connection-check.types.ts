import type { EmailCredentials } from './email-credentials.types';
import type { EmailProviderConfig } from './email-provider.types';

export type EmailConnectionCheckConfig = EmailProviderConfig & {
  credentials: EmailCredentials;
};

export type EmailConnectionCheckFailureReason =
  'authentication' | 'connection' | 'unknown';

export type EmailConnectionCheck =
  | { status: 'verified' }
  | { status: 'failed'; reason: EmailConnectionCheckFailureReason };
