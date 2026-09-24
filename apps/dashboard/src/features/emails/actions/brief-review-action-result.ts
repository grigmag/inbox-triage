import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';

export type BriefReviewActionResult =
  | { status: 'success'; data: BriefEvaluationOutput }
  | { status: 'noConnection' }
  | { status: 'failure'; message: string };
