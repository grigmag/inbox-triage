import { describe, expect, it } from 'vitest';
import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';
import type { BriefReplyState } from '../state/brief-reply-state';
import { getEmailDetailPrimaryAction } from './get-email-detail-primary-action';

type Input = Parameters<typeof getEmailDetailPrimaryAction>[0];
type Reply = Input['reply'];

const provided = { status: 'provided', value: 'Stated', reason: null } as const;

function review(
  outcome: BriefEvaluationOutput['outcome'],
  missingInformation: BriefEvaluationOutput['missingInformation'] = [],
): BriefEvaluationOutput {
  return {
    outcome,
    language: 'en',
    summary: 'A request.',
    fields: {
      projectType: {
        status: 'provided',
        value: { category: 'video', details: null },
        reason: null,
      },
      objective: provided,
      deliverables: provided,
      timeline: provided,
      location: provided,
      budget: provided,
      intendedUse: { status: 'provided', value: ['Website'], reason: null },
      creativeDirection: provided,
      talent: provided,
    },
    missingInformation,
    outcomeReason: 'Reason.',
  };
}

type Question = BriefEvaluationOutput['missingInformation'][number];

const question: Question = {
  fieldKey: 'budget',
  question: 'What is the budget?',
  blocksCompletion: true,
};
const optionalQuestion: Question = {
  fieldKey: 'creativeDirection',
  question: 'Do you have any references?',
  blocksCompletion: false,
};

const noReply: Reply = { draft: null, pending: null, sent: null, error: null };
const drafted: Reply = { ...noReply, draft: 'Hello,' };
const sent: NonNullable<BriefReplyState['sent']> = {
  acceptedRecipients: ['client@example.com'],
  rejectedRecipients: [],
  quotedOriginal: true,
};
const failed: Reply = {
  ...noReply,
  error: { message: 'Unable to draft a reply.', unconfirmed: false },
};

function action(input: Partial<Input>) {
  return getEmailDetailPrimaryAction({
    review: null,
    reviewLoading: false,
    reviewUnavailable: false,
    reply: noReply,
    questionCount: 0,
    ...input,
  });
}

describe('getEmailDetailPrimaryAction', () => {
  it('offers a review before any result', () => {
    expect(action({})).toEqual({ kind: 'review', disabled: false });
  });

  it('disables the review when it is unavailable', () => {
    expect(action({ reviewUnavailable: true })).toEqual({
      kind: 'review',
      disabled: true,
    });
  });

  it('shows the running review, over the previous result', () => {
    expect(action({ reviewLoading: true })).toEqual({ kind: 'reviewing' });
    expect(
      action({
        review: review('needs_information', [question]),
        reviewLoading: true,
        questionCount: 1,
      }),
    ).toEqual({ kind: 'reviewing' });
  });

  it('drafts a reply for a result with questions', () => {
    expect(
      action({
        review: review('needs_information', [question]),
        questionCount: 1,
      }),
    ).toEqual({ kind: 'draftReply', disabled: false });
  });

  it('drafts a reply for a complete result with optional questions', () => {
    expect(
      action({
        review: review('complete', [optionalQuestion]),
        questionCount: 1,
      }),
    ).toEqual({ kind: 'draftReply', disabled: false });
  });

  it('writes a blank reply for a complete result without questions', () => {
    expect(action({ review: review('complete'), questionCount: 0 })).toEqual({
      kind: 'writeReply',
      disabled: false,
    });
  });

  it('offers the retry after a failed first generation', () => {
    expect(
      action({
        review: review('needs_information', [question]),
        reply: failed,
        questionCount: 1,
      }),
    ).toEqual({ kind: 'draftReply', disabled: false });
  });

  it('offers nothing for an irrelevant result', () => {
    expect(action({ review: review('irrelevant') })).toEqual({ kind: 'none' });
  });

  it('goes to the reply while generating, sending, or once a draft exists', () => {
    const needsInformation = review('needs_information', [question]);

    for (const reply of [
      { ...noReply, pending: 'generating' },
      { ...drafted, pending: 'sending' },
      drafted,
      { ...drafted, error: failed.error },
    ] satisfies Reply[]) {
      expect(
        action({ review: needsInformation, reply, questionCount: 1 }),
      ).toEqual({ kind: 'goToReply' });
    }
  });

  it('keeps pointing at the draft during and after a re-review', () => {
    expect(
      action({
        review: review('needs_information', [question]),
        reviewLoading: true,
        reply: drafted,
        questionCount: 1,
      }),
    ).toEqual({ kind: 'goToReply' });
    expect(action({ review: review('irrelevant'), reply: drafted })).toEqual({
      kind: 'goToReply',
    });
  });

  it('shows the sent reply over everything else', () => {
    expect(
      action({
        review: review('irrelevant'),
        reviewLoading: true,
        reply: { ...drafted, sent },
      }),
    ).toEqual({ kind: 'replySent' });
  });
});
