'use client';

import { createContext, use, type RefObject } from 'react';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';
import type { EmailMessageDto } from '@/features/emails/dto/email.dto';
import type { BriefReplyState } from './brief-reply-state';
import type { BriefReplyStaleness } from './get-brief-reply-staleness';
import type { EmailDetailPrimaryAction } from './get-email-detail-primary-action';

/**
 * How much of a review result the card shows. `strip` is one line and applies
 * only once a reply has started.
 */
export type BriefReviewCollapseLevel = 'strip' | 'summary' | 'details';

type EmailDetailState = {
  message: EmailMessageDto;
  review: {
    result: BriefEvaluationOutput | null;
    error: string | null;
    loading: boolean;
    /** Why this email cannot be reviewed. Null when it can. */
    unavailableReason: string | null;
    /** Held here so the header action can collapse the card too. */
    level: BriefReviewCollapseLevel;
    /** The questions the next generation asks, checked in the details. */
    selectedQuestionIndices: readonly number[];
  };
  reply: BriefReplyState & {
    edited: boolean;
    /** A draft, a request in progress, or a reply error exists. */
    started: boolean;
    /**
     * Whether a newer review than the draft's own exists, and what it found,
     * or whether the selected questions changed since the draft.
     */
    staleness: BriefReplyStaleness;
    /**
     * Announced through a status region that stays in the DOM, so screen
     * readers report each change, such as "Reply draft ready."
     */
    statusMessage: string;
    /**
     * The review card offers to start a reply. False when no reply is
     * available or once a draft exists, which the composer then regenerates.
     */
    canStart: boolean;
    /**
     * `hidden` when the latest review has no questions or is not a brief,
     * which the staleness notice then explains. `waiting` while a review runs
     * or while no question is checked, because regenerating would then
     * replace the draft with a blank one.
     */
    regenerate: 'hidden' | 'waiting' | 'ready';
  };
  primaryAction: EmailDetailPrimaryAction;
};

type EmailDetailActions = {
  reviewBrief: () => void;
  /**
   * Drafts a reply from the checked questions, or opens a blank one without
   * questions, and collapses the review card to its strip so the composer
   * becomes the focus of the pane.
   */
  startReply: () => void;
  goToReply: () => void;
  regenerateReply: () => void;
  setReviewLevel: (level: BriefReviewCollapseLevel) => void;
  setQuestionChecked: (index: number, checked: boolean) => void;
  editDraft: (draft: string) => void;
  sendReply: () => void;
};

type EmailDetailMeta = {
  /** The reply editor, focused when a draft arrives. */
  editorRef: RefObject<HTMLTextAreaElement | null>;
  /** Attaches the composer, so going to the reply can scroll to it. */
  composerRef: (node: HTMLDivElement | null) => void;
};

export type EmailDetailContextValue = {
  state: EmailDetailState;
  actions: EmailDetailActions;
  meta: EmailDetailMeta;
};

export const EmailDetailContext = createContext<EmailDetailContextValue | null>(
  null,
);

/** Reads the review and reply workflow shared by `EmailDetailProvider`. */
export function useEmailDetail(): EmailDetailContextValue {
  const context = use(EmailDetailContext);

  if (!context) {
    throw new Error('useEmailDetail must be used inside EmailDetailProvider.');
  }

  return context;
}
