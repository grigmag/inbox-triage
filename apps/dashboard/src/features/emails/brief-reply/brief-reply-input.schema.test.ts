import { describe, expect, it } from 'vitest';
import {
  BRIEF_REPLY_MAX_QUESTION_LENGTH,
  BRIEF_REPLY_MAX_QUESTIONS,
  briefReplyInputSchema,
} from './brief-reply-input.schema';

const question = {
  fieldKey: 'timeline',
  question: 'When should the shoot take place?',
};

describe('briefReplyInputSchema', () => {
  it.each(['el', 'en', 'mixed', 'unknown'])(
    'accepts the %s language',
    (language) => {
      expect(
        briefReplyInputSchema.safeParse({ language, questions: [question] })
          .success,
      ).toBe(true);
    },
  );

  it('accepts the limits and keeps questions unchanged', () => {
    const questions = Array.from({ length: BRIEF_REPLY_MAX_QUESTIONS }, () => ({
      fieldKey: 'budget',
      question: ` ${'a'.repeat(BRIEF_REPLY_MAX_QUESTION_LENGTH - 2)} `,
    }));

    expect(briefReplyInputSchema.parse({ language: 'en', questions })).toEqual({
      language: 'en',
      questions,
    });
  });

  it('strips review fields and browser-supplied content', () => {
    expect(
      briefReplyInputSchema.parse({
        language: 'el',
        questions: [{ ...question, blocksCompletion: true, body: 'Injected' }],
        subject: 'Injected subject',
        body: 'Injected body',
      }),
    ).toEqual({ language: 'el', questions: [question] });
  });

  it.each([
    ['an unknown language', { language: 'fr', questions: [question] }],
    ['a missing language', { questions: [question] }],
    ['no questions', { language: 'en', questions: [] }],
    [
      'too many questions',
      {
        language: 'en',
        questions: Array(BRIEF_REPLY_MAX_QUESTIONS + 1).fill(question),
      },
    ],
    [
      'an unknown field key',
      { language: 'en', questions: [{ ...question, fieldKey: 'price' }] },
    ],
    [
      'an empty question',
      { language: 'en', questions: [{ ...question, question: '' }] },
    ],
    [
      'a whitespace-only question',
      { language: 'en', questions: [{ ...question, question: ' \n\t ' }] },
    ],
    [
      'an oversized question',
      {
        language: 'en',
        questions: [
          {
            ...question,
            question: 'a'.repeat(BRIEF_REPLY_MAX_QUESTION_LENGTH + 1),
          },
        ],
      },
    ],
    [
      'a non-string question',
      { language: 'en', questions: [{ ...question, question: 42 }] },
    ],
    ['a non-object input', 'questions'],
  ])('rejects %s', (_, input) => {
    expect(briefReplyInputSchema.safeParse(input).success).toBe(false);
  });
});
