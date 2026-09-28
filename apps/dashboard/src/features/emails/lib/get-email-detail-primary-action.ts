import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';
import type { BriefReplyState } from '../state/brief-reply-state';

/** The one action the email header offers, following the reply workflow. */
export type EmailDetailPrimaryAction =
  | { kind: 'review'; disabled: boolean }
  | { kind: 'reviewing' }
  | { kind: 'draftReply'; disabled: boolean }
  | { kind: 'writeReply'; disabled: boolean }
  | { kind: 'goToReply' }
  | { kind: 'replySent' }
  | { kind: 'none' };

/**
 * Picks the header action. The first matching rule wins: a sent reply, then a
 * reply in progress or drafted, then a running review, then the latest result.
 */
export function getEmailDetailPrimaryAction({
  review,
  reviewLoading,
  reviewUnavailable,
  reply,
  questionCount,
}: {
  review: BriefEvaluationOutput | null;
  reviewLoading: boolean;
  reviewUnavailable: boolean;
  reply: Pick<BriefReplyState, 'draft' | 'pending' | 'sent' | 'error'>;
  /** Questions the next generation would send. Empty means a blank reply. */
  questionCount: number;
}): EmailDetailPrimaryAction {
  if (reply.sent !== null) {
    return { kind: 'replySent' };
  }

  // A re-review while a draft exists still points at the draft.
  if (reply.pending !== null || reply.draft !== null) {
    return { kind: 'goToReply' };
  }

  if (reviewLoading) {
    return { kind: 'reviewing' };
  }

  if (review?.outcome === 'irrelevant') {
    return { kind: 'none' };
  }

  // Also covers a failed first generation, whose error has no draft, so the
  // header offers the retry. A pending reply or review already matched above,
  // so nothing can disable the action by this point.
  if (review !== null) {
    return {
      kind: questionCount > 0 ? 'draftReply' : 'writeReply',
      disabled: false,
    };
  }

  return { kind: 'review', disabled: reviewUnavailable };
}
