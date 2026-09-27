import type { SentBriefReplyDto } from '../dto/sent-brief-reply.dto';

export type SendBriefReplyActionResult =
  | { status: 'success'; data: SentBriefReplyDto }
  | { status: 'noConnection' }
  // The provider did not confirm the submission; the reply may have been sent.
  | { status: 'unconfirmed'; message: string }
  // Nothing was submitted.
  | { status: 'failure'; message: string };
