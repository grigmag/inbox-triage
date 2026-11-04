import type { GenerateBriefReplyActionResult } from '@/features/emails/actions/generate-brief-reply-action-result';
import type { SendBriefReplyActionResult } from '@/features/emails/actions/send-brief-reply-action-result';
import type { SentBriefReplyDto } from '@/features/emails/dto/sent-brief-reply.dto';
import { getMailboxFailureMessage } from '@/features/emails/lib/get-mailbox-failure-message';

export type BriefReplyStateError = {
  message: string;
  /** The reply may have been sent, so the user must check before retrying. */
  unconfirmed: boolean;
};

export type BriefReplySource = {
  /** The `resultId` of the review the draft was generated or started from. */
  reviewId: number;
  /** The review questions the draft asks, as ascending indices. */
  questionIndices: number[];
};

export type BriefReplyState = {
  /**
   * The text in the composer, which is what gets sent. Every edit updates it.
   * Null until the first draft is generated or a blank reply is started, which
   * also keeps editing and sending unavailable until then.
   */
  draft: string | null;
  /**
   * The text of the latest successful generation. Edits never change it, so
   * comparing it with `draft` tells whether the user has changed the draft and
   * must confirm before regenerating replaces it. Reverting the text by hand
   * counts as unedited, because nothing would be lost. A blank reply starts
   * from its initial draft, which is empty or holds only the company footer.
   */
  generated: string | null;
  pending: 'generating' | 'sending' | null;
  /** Set after a successful send. The draft stays locked from then on. */
  sent: SentBriefReplyDto | null;
  error: BriefReplyStateError | null;
  /** Source of the current draft. Null until a draft exists. */
  source: BriefReplySource | null;
  /** Source of the generation in flight, committed only on success. */
  pendingSource: BriefReplySource | null;
};

export const initialBriefReplyState: BriefReplyState = {
  draft: null,
  generated: null,
  pending: null,
  sent: null,
  error: null,
  source: null,
  pendingSource: null,
};

export type BriefReplyAction =
  | { type: 'startGenerate'; source: BriefReplySource }
  | { type: 'startBlank'; draft: string; source: BriefReplySource }
  | { type: 'setGenerateResult'; result: GenerateBriefReplyActionResult }
  | { type: 'editDraft'; draft: string }
  | { type: 'startSend' }
  | { type: 'setSendResult'; result: SendBriefReplyActionResult };

export function isBriefReplyEdited(state: BriefReplyState): boolean {
  return state.draft !== null && state.draft !== state.generated;
}

/**
 * Whether the reply has anything to show: a draft, a request in progress, or
 * an error. A failed first generation has only its error, which the composer
 * must still display.
 */
export function isBriefReplyStarted(state: BriefReplyState): boolean {
  return state.draft !== null || state.pending !== null || state.error !== null;
}

export function isBriefReplyLocked(state: BriefReplyState): boolean {
  return state.pending !== null || state.sent !== null;
}

export function briefReplyReducer(
  state: BriefReplyState,
  action: BriefReplyAction,
): BriefReplyState {
  switch (action.type) {
    case 'startGenerate':
      if (isBriefReplyLocked(state)) {
        return state;
      }

      return {
        ...state,
        pending: 'generating',
        pendingSource: action.source,
        error: null,
      };

    // For briefs with nothing to ask, the user writes the reply without AI.
    // The initial draft is empty or holds the company footer.
    case 'startBlank':
      if (isBriefReplyLocked(state) || state.draft !== null) {
        return state;
      }

      return {
        ...state,
        draft: action.draft,
        generated: action.draft,
        source: action.source,
        error: null,
      };

    case 'setGenerateResult': {
      if (state.pending !== 'generating') {
        return state;
      }

      const { result } = action;

      // A failed regeneration keeps the current draft and its source beside
      // the error.
      if (result.status === 'success') {
        return {
          ...state,
          draft: result.data.body,
          generated: result.data.body,
          pending: null,
          source: state.pendingSource,
          pendingSource: null,
        };
      }

      return {
        ...state,
        pending: null,
        pendingSource: null,
        error: {
          message: getMailboxFailureMessage(result),
          unconfirmed: false,
        },
      };
    }

    case 'editDraft':
      if (isBriefReplyLocked(state) || state.draft === null) {
        return state;
      }

      return { ...state, draft: action.draft };

    case 'startSend':
      if (isBriefReplyLocked(state) || state.draft === null) {
        return state;
      }

      return { ...state, pending: 'sending', error: null };

    case 'setSendResult': {
      if (state.pending !== 'sending') {
        return state;
      }

      const { result } = action;

      if (result.status === 'success') {
        return { ...state, pending: null, sent: result.data };
      }

      return {
        ...state,
        pending: null,
        error: {
          message: getMailboxFailureMessage(result),
          unconfirmed: result.status === 'unconfirmed',
        },
      };
    }
  }
}
