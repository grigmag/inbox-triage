'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Empty, EmptyHeader, EmptyDescription, Skeleton } from '@inbox-triage/ui';
import { BRIEF_REVIEW_MAX_BODY_LENGTH } from '../brief-review/brief-review-v1.config';
import type { EmailMessageDto } from '../dto/email.dto';
import { useBriefReply } from '../hooks/use-brief-reply';
import { useBriefReview } from '../hooks/use-brief-review';
import {
  type BriefReplyQuestionSelection,
  getSelectedQuestionIndices,
  pickSelectedQuestions,
  toggleQuestionIndex,
} from '../lib/brief-reply-question-selection';
import { getBriefReplyStaleness } from '../lib/get-brief-reply-staleness';
import { getEmailDetailPrimaryAction } from '../lib/get-email-detail-primary-action';
import { EmailBodyText } from './email-body-text';
import { EmailDetailHeader } from './email-detail-header';
import { EmailDetailHeaderAction } from './email-detail-header-action';
import { EmailFailure } from './email-failure';
import { EmailReplyComposer } from './email-reply-composer';
import {
  EmailReviewPanel,
  type BriefReviewCollapseLevel,
} from './email-review-panel';

const draftReadyMessage = 'Reply draft ready.';

// Mirrors the server's checks so the action explains why it's unavailable.
function getReviewUnavailableReason(text: string | null): string | null {
  if (!text?.trim()) {
    return 'Review needs plain-text content.';
  }

  if (text.length > BRIEF_REVIEW_MAX_BODY_LENGTH) {
    return 'This email is too long to review.';
  }

  return null;
}

function scrollIntoViewGently(
  element: HTMLElement,
  block: ScrollLogicalPosition = 'start',
) {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  element.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block,
  });
}

export function EmailDetail({
  message,
  loading,
  error,
  retry,
}: {
  message: EmailMessageDto | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}) {
  const briefReview = useBriefReview();
  const briefReply = useBriefReply();
  const [reviewLevel, setReviewLevel] =
    useState<BriefReviewCollapseLevel>('summary');
  const [replyStatus, setReplyStatus] = useState('');
  const [questionSelection, setQuestionSelection] =
    useState<BriefReplyQuestionSelection | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const reviewPanelRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  // Set when a reply starts before the composer exists, so the composer is
  // scrolled into view once, as it mounts.
  const scrollOnMountRef = useRef(false);
  const setComposerNode = useCallback((node: HTMLDivElement | null) => {
    composerRef.current = node;

    if (node && scrollOnMountRef.current) {
      scrollOnMountRef.current = false;
      scrollIntoViewGently(node);
    }
  }, []);

  // The card sits below the email, often out of view. Reveal a new result or
  // error; `nearest` leaves an already visible card where it is.
  useEffect(() => {
    if ((briefReview.result || briefReview.error) && reviewPanelRef.current) {
      scrollIntoViewGently(reviewPanelRef.current, 'nearest');
    }
  }, [briefReview.result, briefReview.error]);

  if (loading)
    return (
      <div
        role="status"
        aria-label="Loading email"
        className="mx-auto flex w-full max-w-[820px] flex-col gap-4"
      >
        <Skeleton className="h-8 w-2/3" />

        <Skeleton className="h-24 w-full" />

        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (error) return <EmailFailure message={error} retry={retry} />;
  if (!message)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>
            Select an email to view its contents.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  const review = briefReview.result;
  const reviewId = briefReview.resultId;
  const replyAvailable = review !== null && review.outcome !== 'irrelevant';
  const reviewHasQuestions =
    replyAvailable && review.missingInformation.length > 0;
  // A new review result checks every question again, because the selection
  // belongs to the review it was made for.
  const selectedQuestionIndices = getSelectedQuestionIndices(
    questionSelection,
    reviewId,
    review?.missingInformation.length ?? 0,
  );
  // Generation uses the latest review's checked questions. With none, the
  // reply starts blank, because there is nothing for AI to ask.
  const replyQuestions =
    reviewHasQuestions && selectedQuestionIndices.length > 0
      ? {
          language: review.language,
          questions: pickSelectedQuestions(
            review.missingInformation,
            selectedQuestionIndices,
          ),
        }
      : null;
  const messageRef = message.ref;
  const reviewUnavailableReason = getReviewUnavailableReason(message.text);
  const primaryAction = getEmailDetailPrimaryAction({
    review,
    reviewLoading: briefReview.loading,
    reviewUnavailable: reviewUnavailableReason !== null,
    reply: briefReply,
    questionCount: replyQuestions?.questions.length ?? 0,
  });
  const replyStaleness = getBriefReplyStaleness({
    source: briefReply.source,
    review,
    reviewId,
    selectedQuestionIndices,
    sent: briefReply.sent !== null,
  });

  function setQuestionChecked(index: number, checked: boolean) {
    if (reviewId === null) {
      return;
    }

    setQuestionSelection({
      reviewId,
      questionIndices: toggleQuestionIndex(
        selectedQuestionIndices,
        index,
        checked,
      ),
    });
  }

  function reviewBrief() {
    void briefReview.review(messageRef);
  }

  function scrollToComposer() {
    if (composerRef.current) {
      scrollIntoViewGently(composerRef.current);
    } else {
      scrollOnMountRef.current = true;
    }
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

    const drafted = await briefReply.generate(messageRef, replyQuestions, {
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

  // Shared by the header action and the review card's button.
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
      briefReply.startBlank({ reviewId, questionIndices: [] });
    });
    scrollToComposer();
    focusEditor();
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-10">
      <article className="flex flex-col gap-6">
        <EmailDetailHeader
          message={message}
          action={
            <EmailDetailHeaderAction
              action={primaryAction}
              onReview={reviewBrief}
              onStartReply={startReply}
              onGoToReply={scrollToComposer}
            />
          }
        />

        {message.text !== null && message.text.length > 0 ? (
          <EmailBodyText text={message.text} />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyDescription>
                Plain-text content is unavailable for this email.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </article>

      <div ref={reviewPanelRef} className="scroll-my-6">
        <EmailReviewPanel
          result={briefReview.result}
          error={briefReview.error}
          loading={briefReview.loading}
          unavailableReason={reviewUnavailableReason}
          onReview={reviewBrief}
          draftReplyDisabled={
            briefReview.loading || briefReply.pending !== null
          }
          onDraftReply={
            replyAvailable && briefReply.draft === null ? startReply : undefined
          }
          replyStarted={briefReply.started}
          replyPending={briefReply.pending !== null}
          level={reviewLevel}
          onLevelChange={setReviewLevel}
          selectedQuestionIndices={selectedQuestionIndices}
          onQuestionCheckedChange={setQuestionChecked}
          questionsDisabled={
            briefReply.pending !== null || briefReply.sent !== null
          }
        />
      </div>

      {briefReply.started && (
        <div ref={setComposerNode} className="scroll-mt-6">
          <EmailReplyComposer
            ref={editorRef}
            message={message}
            reply={briefReply}
            // With nothing checked, regenerating would replace the draft with
            // a blank one, so it waits for a selection instead.
            canRegenerate={!briefReview.loading && replyQuestions !== null}
            staleness={replyStaleness}
            // Hidden when the latest review has no questions or is not a
            // brief, which the staleness notice then explains.
            onRegenerate={
              reviewHasQuestions ? () => void generateReply() : undefined
            }
            statusMessage={replyStatus}
          />
        </div>
      )}
    </div>
  );
}
