import type { BriefReviewRunMetadata } from './evaluate-brief';

/**
 * Base class for expected Brief Review failures. The message is safe to show
 * to the user and never contains email content or provider details.
 */
export class BriefReviewError extends Error {}

export class BriefReviewMailboxError extends BriefReviewError {
  constructor() {
    super(
      'Unable to load the email for review. Please try again or check Email settings.',
    );
    this.name = 'BriefReviewMailboxError';
  }
}

export class BriefReviewMissingTextError extends BriefReviewError {
  constructor() {
    super('This email has no plain-text content to review.');
    this.name = 'BriefReviewMissingTextError';
  }
}

export class BriefReviewBodyTooLongError extends BriefReviewError {
  constructor() {
    super('This email is too long to review.');
    this.name = 'BriefReviewBodyTooLongError';
  }
}

export class BriefReviewInvalidOutputError extends BriefReviewError {
  /** Attempt metadata for evaluation reports. Never returned to the browser. */
  readonly metadata: BriefReviewRunMetadata;

  constructor(metadata: BriefReviewRunMetadata) {
    super('The email review returned an invalid result. Please try again.');
    this.name = 'BriefReviewInvalidOutputError';
    this.metadata = metadata;
  }
}

export class BriefReviewProviderError extends BriefReviewError {
  constructor() {
    super('The email review service is unavailable. Please try again.');
    this.name = 'BriefReviewProviderError';
  }
}

export class BriefReviewTimeoutError extends BriefReviewError {
  constructor() {
    super('The email review timed out. Please try again.');
    this.name = 'BriefReviewTimeoutError';
  }
}
