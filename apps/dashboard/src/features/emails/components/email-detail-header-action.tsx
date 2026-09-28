import { Badge, Button, Spinner } from '@inbox-triage/ui';
import {
  ArrowDownIcon,
  CircleCheckIcon,
  ReplyIcon,
  SparklesIcon,
} from 'lucide-react';
import type { EmailDetailPrimaryAction } from '../lib/get-email-detail-primary-action';
import { successBadgeClassName } from './brief-review-status';

/** The header's primary action, which follows the reply workflow. */
export function EmailDetailHeaderAction({
  action,
  onReview,
  onStartReply,
  onGoToReply,
}: {
  action: EmailDetailPrimaryAction;
  onReview: () => void;
  /** Drafts or opens a blank reply, as the review card's button does. */
  onStartReply: () => void;
  onGoToReply: () => void;
}) {
  switch (action.kind) {
    case 'review':
      return (
        <Button onClick={onReview} disabled={action.disabled}>
          <SparklesIcon data-icon="inline-start" />
          Review brief
        </Button>
      );

    case 'reviewing':
      return (
        <Button disabled>
          <Spinner data-icon="inline-start" />
          Reviewing...
        </Button>
      );

    case 'draftReply':
    case 'writeReply':
      return (
        <Button onClick={onStartReply} disabled={action.disabled}>
          <ReplyIcon data-icon="inline-start" />

          {action.kind === 'draftReply' ? 'Draft reply' : 'Write reply'}
        </Button>
      );

    case 'goToReply':
      return (
        <Button variant="outline" onClick={onGoToReply}>
          Go to reply
          <ArrowDownIcon data-icon="inline-end" />
        </Button>
      );

    // Not a button: there is nothing left to do.
    case 'replySent':
      return (
        <Badge variant="outline" className={successBadgeClassName}>
          <CircleCheckIcon data-icon="inline-start" />
          Reply sent
        </Badge>
      );

    case 'none':
      return null;
  }
}
