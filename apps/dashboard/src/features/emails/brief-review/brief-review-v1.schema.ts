import { z } from 'zod';
import {
  BRIEF_REVIEW_V1_FIELD_KEYS,
  fieldBlocksCompletion,
  type BriefReviewFieldKey,
} from './brief-review-v1.config';

const usableStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, 'Must contain visible text');

const briefReviewFieldKeySchema = z.enum(BRIEF_REVIEW_V1_FIELD_KEYS);

const projectTypeValueSchema = z
  .strictObject({
    category: z.enum([
      'photography',
      'video',
      'photography_and_video',
      'other',
    ]),
    details: usableStringSchema.nullable(),
  })
  .superRefine(({ category, details }, context) => {
    if (category === 'other' && details === null) {
      context.addIssue({
        code: 'custom',
        path: ['details'],
        message: 'Project type "other" requires details',
      });
    }
  });

function analysisFieldSchema<Value extends object | string, Input>(
  valueSchema: z.ZodType<Value, Input>,
) {
  return z
    .strictObject({
      status: z.enum(['provided', 'missing', 'ambiguous']),
      value: valueSchema.nullable(),
      reason: usableStringSchema.nullable(),
    })
    .superRefine(({ status, value, reason }, context) => {
      if (status === 'provided') {
        if (value === null) {
          context.addIssue({
            code: 'custom',
            path: ['value'],
            message: 'A provided field requires a value',
          });
        } else if (Array.isArray(value) && value.length === 0) {
          context.addIssue({
            code: 'custom',
            path: ['value'],
            message: 'A provided list requires at least one item',
          });
        }

        if (reason !== null) {
          context.addIssue({
            code: 'custom',
            path: ['reason'],
            message: 'A provided field requires a null reason',
          });
        }

        return;
      }

      if (status === 'missing' && value !== null) {
        context.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'A missing field requires a null value',
        });
      }

      if (reason === null) {
        context.addIssue({
          code: 'custom',
          path: ['reason'],
          message: 'A missing or ambiguous field requires a reason',
        });
      }
    });
}

const briefEvaluationFieldsV1Schema = z.strictObject({
  projectType: analysisFieldSchema(projectTypeValueSchema),
  objective: analysisFieldSchema(usableStringSchema),
  deliverables: analysisFieldSchema(usableStringSchema),
  timeline: analysisFieldSchema(usableStringSchema),
  location: analysisFieldSchema(usableStringSchema),
  budget: analysisFieldSchema(usableStringSchema),
  intendedUse: analysisFieldSchema(z.array(usableStringSchema)),
  creativeDirection: analysisFieldSchema(usableStringSchema),
  talent: analysisFieldSchema(usableStringSchema),
} satisfies Record<BriefReviewFieldKey, z.ZodType>);

const missingInformationItemSchema = z.strictObject({
  fieldKey: briefReviewFieldKeySchema,
  question: usableStringSchema,
  blocksCompletion: z.boolean(),
});

export const briefEvaluationOutputV1Schema = z
  .strictObject({
    outcome: z.enum(['irrelevant', 'needs_information', 'complete']),
    language: z.enum(['el', 'en', 'mixed', 'unknown']),
    summary: usableStringSchema,
    fields: briefEvaluationFieldsV1Schema,
    missingInformation: z.array(missingInformationItemSchema),
    outcomeReason: usableStringSchema,
  })
  .superRefine(({ outcome, fields, missingInformation }, context) => {
    for (const [index, item] of missingInformation.entries()) {
      if (fields[item.fieldKey].status === 'provided') {
        context.addIssue({
          code: 'custom',
          path: ['missingInformation', index, 'fieldKey'],
          message: 'A clarification question cannot target a provided field',
        });
      }

      const expected = fieldBlocksCompletion(item.fieldKey, fields);

      if (item.blocksCompletion !== expected) {
        context.addIssue({
          code: 'custom',
          path: ['missingInformation', index, 'blocksCompletion'],
          message: `Expected blocksCompletion to be ${expected}`,
        });
      }
    }

    const hasBlockingQuestion = missingInformation.some(
      (item) => item.blocksCompletion,
    );

    switch (outcome) {
      case 'irrelevant':
        if (missingInformation.length > 0) {
          context.addIssue({
            code: 'custom',
            path: ['missingInformation'],
            message: 'An irrelevant email cannot have clarification questions',
          });
        }
        break;

      case 'complete':
        if (
          BRIEF_REVIEW_V1_FIELD_KEYS.some((key) =>
            fieldBlocksCompletion(key, fields),
          )
        ) {
          context.addIssue({
            code: 'custom',
            path: ['outcome'],
            message:
              'A complete brief requires project type or objective, deliverables, and timeline',
          });
        }

        if (hasBlockingQuestion) {
          context.addIssue({
            code: 'custom',
            path: ['missingInformation'],
            message:
              'A complete brief cannot have completion-blocking questions',
          });
        }
        break;

      case 'needs_information':
        if (!hasBlockingQuestion) {
          context.addIssue({
            code: 'custom',
            path: ['missingInformation'],
            message:
              'A brief that needs information requires a completion-blocking question',
          });
        }
        break;
    }
  });

export type BriefEvaluationOutput = z.infer<
  typeof briefEvaluationOutputV1Schema
>;
