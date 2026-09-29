import type { BriefReplyStaleness } from '../get-brief-reply-staleness';

/** Shown in the composer and repeated as a warning before sending. */
export const stalenessNotices: Record<
  NonNullable<BriefReplyStaleness>,
  string
> = {
  reviewChanged:
    'This draft was written from an earlier review. Regenerate to use the current questions.',
  nothingToAsk:
    'The latest review found nothing to ask. Check this draft before sending.',
  notABrief:
    'The latest review says this is not a production brief. Check this draft before sending.',
  selectionChanged:
    'The selected questions changed. Regenerate to update the draft.',
};
