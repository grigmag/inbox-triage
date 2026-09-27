import type { BriefReplyRunMetadata } from './generate-brief-reply';

/**
 * Base class for expected Brief Reply failures. The message is safe to show
 * to the user and never contains email content or provider details.
 */
export class BriefReplyError extends Error {}

export class BriefReplyInvalidOutputError extends BriefReplyError {
  /** Run metadata for evaluation reports. Never returned to the browser. */
  readonly metadata: BriefReplyRunMetadata;

  constructor(metadata: BriefReplyRunMetadata) {
    super('The reply draft was invalid. Please try again.');
    this.name = 'BriefReplyInvalidOutputError';
    this.metadata = metadata;
  }
}

export class BriefReplyProviderError extends BriefReplyError {
  constructor() {
    super('The reply drafting service is unavailable. Please try again.');
    this.name = 'BriefReplyProviderError';
  }
}

export class BriefReplyTimeoutError extends BriefReplyError {
  constructor() {
    super('Drafting the reply timed out. Please try again.');
    this.name = 'BriefReplyTimeoutError';
  }
}

export class BriefReplyMailboxError extends BriefReplyError {
  constructor() {
    super(
      'Unable to load the email for the reply. Please try again or check Email settings.',
    );
    this.name = 'BriefReplyMailboxError';
  }
}

export class BriefReplyMissingTextError extends BriefReplyError {
  constructor() {
    super('This email has no plain-text content to reply to.');
    this.name = 'BriefReplyMissingTextError';
  }
}

export class BriefReplyBodyTooLongError extends BriefReplyError {
  constructor() {
    super('This email is too long to draft a reply.');
    this.name = 'BriefReplyBodyTooLongError';
  }
}

export class BriefReplySendFailedError extends BriefReplyError {
  constructor(message: string) {
    super(message);
    this.name = 'BriefReplySendFailedError';
  }
}

/**
 * The provider did not confirm the submission, so the reply may have been
 * sent. The user must check their Sent folder instead of retrying blindly.
 */
export class BriefReplySendUnconfirmedError extends BriefReplyError {
  constructor() {
    super(
      'The email provider did not confirm that the reply was sent. Check your Sent folder before sending again.',
    );
    this.name = 'BriefReplySendUnconfirmedError';
  }
}
