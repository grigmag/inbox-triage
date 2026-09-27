import { z } from 'zod';
import {
  briefReviewFieldKeySchema,
  briefReviewLanguageSchema,
} from '../brief-review/brief-review-v1.schema';
import type { BriefReplyQuestion } from './generate-brief-reply';

export const BRIEF_REPLY_MAX_QUESTIONS = 20;
export const BRIEF_REPLY_MAX_QUESTION_LENGTH = 500;

const briefReplyQuestionSchema = z.object({
  fieldKey: briefReviewFieldKeySchema,
  question: z
    .string()
    .max(BRIEF_REPLY_MAX_QUESTION_LENGTH)
    .refine((value) => value.trim().length > 0, 'Must contain visible text'),
}) satisfies z.ZodType<BriefReplyQuestion>;

/**
 * The review output the browser supplies to shape a reply draft. Unknown keys
 * are stripped, so browser-supplied email content never reaches the prompt.
 */
export const briefReplyInputSchema = z.object({
  language: briefReviewLanguageSchema,
  questions: z
    .array(briefReplyQuestionSchema)
    .min(1)
    .max(BRIEF_REPLY_MAX_QUESTIONS),
});

export type BriefReplyActionInput = z.infer<typeof briefReplyInputSchema>;
