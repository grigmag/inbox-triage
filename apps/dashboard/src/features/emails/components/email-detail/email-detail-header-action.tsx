import { Button, Spinner } from '@inbox-triage/ui';
import { ArrowDownIcon, ReplyIcon, SparklesIcon } from 'lucide-react';
import { SuccessBadge } from '@/features/emails/components/success-badge';
import { useEmailDetail } from './email-detail-context';

/** The header's primary action, which follows the reply workflow. */
export function EmailDetailHeaderAction() {
  const {
    state: { primaryAction: action },
    actions: { reviewBrief, startReply, goToReply },
  } = useEmailDetail();

  switch (action.kind) {
    case 'review':
      return (
        <Button onClick={reviewBrief} disabled={action.disabled}>
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

    // Drafts or opens a blank reply, as the review card's button does.
    case 'draftReply':
    case 'writeReply':
      return (
        <Button onClick={startReply}>
          <ReplyIcon data-icon="inline-start" />

          {action.kind === 'draftReply' ? 'Draft reply' : 'Write reply'}
        </Button>
      );

    case 'goToReply':
      return (
        <Button variant="outline" onClick={goToReply}>
          Go to reply
          <ArrowDownIcon data-icon="inline-end" />
        </Button>
      );

    // Not a button: there is nothing left to do.
    case 'replySent':
      return <SuccessBadge>Reply sent</SuccessBadge>;

    case 'none':
      return null;
  }
}
