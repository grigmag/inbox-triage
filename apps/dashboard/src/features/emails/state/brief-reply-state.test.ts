import { describe, expect, it } from 'vitest';
import {
  briefReplyReducer,
  initialBriefReplyState,
  isBriefReplyEdited,
  isBriefReplyLocked,
  isBriefReplyStarted,
  type BriefReplyAction,
  type BriefReplyState,
} from './brief-reply-state';

function reduce(
  state: BriefReplyState,
  ...actions: BriefReplyAction[]
): BriefReplyState {
  return actions.reduce(briefReplyReducer, state);
}

function generated(body: string): BriefReplyAction[] {
  return [
    { type: 'startGenerate' },
    {
      type: 'setGenerateResult',
      result: { status: 'success', data: { body } },
    },
  ];
}

const drafted = reduce(initialBriefReplyState, ...generated('Hello,'));

const sent = reduce(
  drafted,
  { type: 'startSend' },
  {
    type: 'setSendResult',
    result: {
      status: 'success',
      data: {
        acceptedRecipients: ['client@example.com'],
        rejectedRecipients: [],
        quotedOriginal: true,
      },
    },
  },
);

describe('briefReplyReducer', () => {
  it('places a generated body in an unedited draft', () => {
    expect(drafted).toEqual({
      ...initialBriefReplyState,
      draft: 'Hello,',
      generated: 'Hello,',
    });
    expect(isBriefReplyEdited(drafted)).toBe(false);
  });

  it('starts the reply once a request begins and keeps a failed first draft visible', () => {
    expect(isBriefReplyStarted(initialBriefReplyState)).toBe(false);

    const generating = reduce(initialBriefReplyState, {
      type: 'startGenerate',
    });

    expect(isBriefReplyStarted(generating)).toBe(true);

    const failed = reduce(generating, {
      type: 'setGenerateResult',
      result: { status: 'failure', message: 'Drafting timed out.' },
    });

    expect(failed.draft).toBeNull();
    expect(isBriefReplyStarted(failed)).toBe(true);
  });

  it('marks the draft as edited until regeneration replaces it', () => {
    const edited = reduce(drafted, { type: 'editDraft', draft: 'Hi,' });

    expect(isBriefReplyEdited(edited)).toBe(true);

    const regenerated = reduce(edited, ...generated('Dear client,'));

    expect(regenerated.draft).toBe('Dear client,');
    expect(isBriefReplyEdited(regenerated)).toBe(false);
  });

  it('keeps the current draft beside a failed regeneration', () => {
    const edited = reduce(drafted, { type: 'editDraft', draft: 'Hi,' });
    const failed = reduce(
      edited,
      { type: 'startGenerate' },
      {
        type: 'setGenerateResult',
        result: { status: 'failure', message: 'Drafting timed out.' },
      },
    );

    expect(failed.draft).toBe('Hi,');
    expect(failed.pending).toBeNull();
    expect(failed.error).toEqual({
      message: 'Drafting timed out.',
      unconfirmed: false,
    });
  });

  it('ignores overlapping requests and edits while one is pending', () => {
    const generating = reduce(drafted, { type: 'startGenerate' });

    expect(isBriefReplyLocked(generating)).toBe(true);
    expect(
      reduce(
        generating,
        { type: 'startGenerate' },
        { type: 'startSend' },
        { type: 'editDraft', draft: 'Hi,' },
      ),
    ).toBe(generating);

    const sending = reduce(drafted, { type: 'startSend' });

    expect(
      reduce(
        sending,
        { type: 'startGenerate' },
        { type: 'startSend' },
        { type: 'editDraft', draft: 'Hi,' },
      ),
    ).toBe(sending);
  });

  it('ignores results for a request that is not pending', () => {
    expect(
      reduce(drafted, {
        type: 'setGenerateResult',
        result: { status: 'success', data: { body: 'Late' } },
      }),
    ).toBe(drafted);
    expect(
      reduce(drafted, {
        type: 'setSendResult',
        result: { status: 'failure', message: 'Late' },
      }),
    ).toBe(drafted);
  });

  it('starts a blank reply that is unedited until the user types', () => {
    const blank = reduce(initialBriefReplyState, { type: 'startBlank' });

    expect(blank.draft).toBe('');
    expect(isBriefReplyStarted(blank)).toBe(true);
    expect(isBriefReplyEdited(blank)).toBe(false);

    const typed = reduce(blank, { type: 'editDraft', draft: 'Hi,' });

    expect(typed.draft).toBe('Hi,');
    expect(isBriefReplyEdited(typed)).toBe(true);
  });

  it('does not start a blank reply over a draft or while locked', () => {
    const generating = reduce(initialBriefReplyState, {
      type: 'startGenerate',
    });

    expect(reduce(drafted, { type: 'startBlank' })).toBe(drafted);
    expect(reduce(generating, { type: 'startBlank' })).toBe(generating);
    expect(reduce(sent, { type: 'startBlank' })).toBe(sent);
  });

  it('does not send or edit before a draft exists', () => {
    expect(
      reduce(
        initialBriefReplyState,
        { type: 'startSend' },
        { type: 'editDraft', draft: 'Hi,' },
      ),
    ).toBe(initialBriefReplyState);
  });

  it('locks the draft after a successful send', () => {
    expect(sent.sent).toEqual({
      acceptedRecipients: ['client@example.com'],
      rejectedRecipients: [],
      quotedOriginal: true,
    });
    expect(isBriefReplyLocked(sent)).toBe(true);
    expect(
      reduce(
        sent,
        { type: 'startSend' },
        { type: 'startGenerate' },
        { type: 'editDraft', draft: 'Hi,' },
      ),
    ).toBe(sent);
  });

  it('keeps an unconfirmed send editable and flags it', () => {
    const unconfirmed = reduce(
      drafted,
      { type: 'startSend' },
      {
        type: 'setSendResult',
        result: { status: 'unconfirmed', message: 'Check your Sent folder.' },
      },
    );

    expect(unconfirmed.sent).toBeNull();
    expect(isBriefReplyLocked(unconfirmed)).toBe(false);
    expect(unconfirmed.error).toEqual({
      message: 'Check your Sent folder.',
      unconfirmed: true,
    });
  });

  it.each([
    [
      { status: 'noConnection' } as const,
      'Connect your mailbox in Email settings.',
    ],
    [{ status: 'failure', message: 'Not sent.' } as const, 'Not sent.'],
  ])('reports a send result of $status as not sent', (result, message) => {
    const failed = reduce(
      drafted,
      { type: 'startSend' },
      { type: 'setSendResult', result },
    );

    expect(failed.error).toEqual({ message, unconfirmed: false });
    expect(isBriefReplyLocked(failed)).toBe(false);
  });
});
