'use client';

import { useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { appendReplyFooter } from '@/features/emails/brief-reply/reply-footer.utils';
import { BRIEF_REVIEW_MAX_BODY_LENGTH } from '@/features/emails/brief-review/brief-review-v1.config';
import type { EmailMessageDto } from '@/features/emails/dto/email.dto';
import { useScrollIntoViewOnMount } from '@/hooks/use-scroll-into-view-on-mount';
import {
  EmailDetailContext,
  type BriefReviewCollapseLevel,
  type EmailDetailContextValue,
} from './email-detail-context';
import { getBriefReplyStaleness } from './get-brief-reply-staleness';
import { getEmailDetailPrimaryAction } from './get-email-detail-primary-action';
import { useBriefReply } from './use-brief-reply';
import { useBriefReplyQuestions } from './use-brief-reply-questions';
import { useBriefReview } from './use-brief-review';

const draftReadyMessage = 'Reply draft ready.';

/** Mirrors the server's checks so the action explains why it's unavailable. */
function getReviewUnavailableReason(text: string | null): string | null {
  if (!text?.trim()) {
    return 'Review needs plain-text content.';
  }

  if (text.length > BRIEF_REVIEW_MAX_BODY_LENGTH) {
    return 'This email is too long to review.';
  }

  return null;
}

/**
 * Owns the review and reply workflow for one loaded message and shares it
 * with the header action, the review card, and the composer. It is the only
 * place that knows how that state is held.
 */
export function EmailDetailProvider({
  message,
  replyFooter,
  children,
}: {
  message: EmailMessageDto;
  /** The company footer that blank replies start with. */
  replyFooter: string | null;
  children: ReactNode;
}) {
  const briefReview = useBriefReview();
  const { generate, startBlank, send, editDraft, ...reply } = useBriefReply();
  const review = briefReview.result;
  const reviewId = briefReview.resultId;
  const {
    reviewHasQuestions,
    selectedQuestionIndices,
    replyQuestions,
    setQuestionChecked,
  } = useBriefReplyQuestions(review, reviewId);
  const { setNode: composerRef, scrollIntoView: scrollToComposer } =
    useScrollIntoViewOnMount<HTMLDivElement>();
  const [reviewLevel, setReviewLevel] =
    useState<BriefReviewCollapseLevel>('summary');
  const [replyStatus, setReplyStatus] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const reviewUnavailableReason = getReviewUnavailableReason(message.text);

  function reviewBrief() {
    void briefReview.review(message.ref);
  }

  function focusEditor() {
    // The pane already scrolled to the composer, so focus must not jump it.
    editorRef.current?.focus({ preventScroll: true });
  }

  async function generateReply() {
    if (!replyQuestions || reviewId === null) {
      return;
    }

    // Clear first, so the same message is announced again on regeneration.
    setReplyStatus('');

    const drafted = await generate(message.ref, replyQuestions, {
      reviewId,
      questionIndices: selectedQuestionIndices,
    });

    // The draft is already rendered. After a remount the ref is null, so
    // nothing happens.
    if (drafted) {
      setReplyStatus(draftReadyMessage);
      focusEditor();
    }
  }

  function startReply() {
    if (reviewId === null) {
      return;
    }

    if (replyQuestions) {
      setReviewLevel('strip');
      scrollToComposer();
      void generateReply();
      return;
    }

    // Commit the blank draft now, so the editor exists to scroll to and focus.
    flushSync(() => {
      setReviewLevel('strip');
      startBlank(appendReplyFooter({ body: '', footer: replyFooter }), {
        reviewId,
        questionIndices: [],
      });
    });
    scrollToComposer();
    focusEditor();
    // The user types above the footer.
    editorRef.current?.setSelectionRange(0, 0);
  }

  let regenerate: EmailDetailContextValue['state']['reply']['regenerate'] =
    'hidden';

  if (reviewHasQuestions) {
    regenerate =
      !briefReview.loading && replyQuestions !== null ? 'ready' : 'waiting';
  }

  const value: EmailDetailContextValue = {
    state: {
      message,
      review: {
        result: review,
        error: briefReview.error,
        loading: briefReview.loading,
        unavailableReason: reviewUnavailableReason,
        level: reviewLevel,
        selectedQuestionIndices,
      },
      reply: {
        ...reply,
        staleness: getBriefReplyStaleness({
          source: reply.source,
          review,
          reviewId,
          selectedQuestionIndices,
          sent: reply.sent !== null,
        }),
        statusMessage: replyStatus,
        canStart:
          review !== null &&
          review.outcome !== 'irrelevant' &&
          reply.draft === null,
        regenerate,
      },
      primaryAction: getEmailDetailPrimaryAction({
        review,
        reviewLoading: briefReview.loading,
        reviewUnavailable: reviewUnavailableReason !== null,
        reply,
        questionCount: replyQuestions?.questions.length ?? 0,
      }),
    },
    actions: {
      reviewBrief,
      startReply,
      goToReply: scrollToComposer,
      regenerateReply: () => void generateReply(),
      setReviewLevel,
      setQuestionChecked,
      editDraft,
      sendReply: () => void send(message.ref),
    },
    meta: { editorRef, composerRef },
  };

  return <EmailDetailContext value={value}>{children}</EmailDetailContext>;
}
