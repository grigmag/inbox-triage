import type { ReplyEmailResult } from '@inbox-triage/email';

export type SentBriefReplyDto = {
  acceptedRecipients: string[];
  rejectedRecipients: string[];
  /** False when the original was too large to quote and was left out. */
  quotedOriginal: boolean;
};

export function toSentBriefReplyDto(
  result: ReplyEmailResult,
): SentBriefReplyDto {
  return {
    acceptedRecipients: result.acceptedRecipients,
    rejectedRecipients: result.rejectedRecipients,
    quotedOriginal: result.quotedParent,
  };
}
