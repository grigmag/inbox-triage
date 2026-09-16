import { describe, expect, it } from 'vitest';
import {
  emailReducer,
  initialEmailState,
  type EmailState,
} from './email-state';
import type { EmailMessageDto, EmailSummaryDto } from '../dto/email.dto';

function summary(ref: string): EmailSummaryDto {
  return {
    ref,
    from: [],
    subject: ref,
    receivedAt: '2026-09-14T12:00:00Z',
    isRead: false,
  };
}
const full: EmailMessageDto = {
  ...summary('b'),
  to: [],
  cc: [],
  replyTo: [],
  sentAt: null,
  text: 'Body',
};
function loaded(): EmailState {
  return {
    ...initialEmailState,
    messages: ['b', 'c'].map(summary),
    nextPageToken: 'older',
    selectedRef: 'b',
    message: full,
    messageRequestId: 1,
  };
}
describe('emailReducer', () => {
  it('loads summaries without selecting or downloading a message', () => {
    const state = emailReducer(initialEmailState, {
      type: 'setPageResult',
      operation: 'initial',
      result: {
        status: 'success',
        data: {
          messages: ['b', 'b', 'c'].map(summary),
          nextPageToken: 'older',
        },
      },
    });
    expect(state.messages.map((m) => m.ref)).toEqual(['b', 'c']);
    expect(state.selectedRef).toBeNull();
    expect(state.message).toBeNull();
    expect(state.nextPageToken).toBe('older');
  });
  it('prepends newer batches and appends older batches without duplicates', () => {
    let state = emailReducer(loaded(), {
      type: 'setRefreshResult',
      result: { status: 'success', data: ['a', 'a', 'b'].map(summary) },
    });
    state = emailReducer(state, {
      type: 'setPageResult',
      operation: 'older',
      result: {
        status: 'success',
        data: { messages: ['c', 'd', 'd'].map(summary), nextPageToken: null },
      },
    });
    expect(state.messages.map((m) => m.ref)).toEqual(['a', 'b', 'c', 'd']);
    expect(state.message).toBe(full);
    expect(state.selectedRef).toBe('b');
    expect(state.nextPageToken).toBeNull();
  });
  it('preserves selection, detail and pagination on empty refresh', () => {
    const before = loaded();
    const state = emailReducer(before, {
      type: 'setRefreshResult',
      result: { status: 'success', data: [] },
    });
    expect(state.messages).toEqual(before.messages);
    expect(state.message).toBe(full);
    expect(state.selectedRef).toBe('b');
    expect(state.nextPageToken).toBe('older');
  });
  it.each(['refresh', 'older'] as const)(
    'preserves loaded state after %s failure',
    (operation) => {
      const before = loaded();
      const result = { status: 'failure', message: 'Safe failure' } as const;
      const state = emailReducer(
        before,
        operation === 'refresh'
          ? { type: 'setRefreshResult', result }
          : { type: 'setPageResult', operation, result },
      );
      expect(state.messages).toBe(before.messages);
      expect(state.selectedRef).toBe('b');
      expect(state.message).toBe(full);
      expect(state.nextPageToken).toBe('older');
      expect(state[operation]).toEqual({
        loading: false,
        error: 'Safe failure',
      });
    },
  );
  it('clears only the old full message on selection and retains summaries after detail failure', () => {
    const before = loaded();
    let state = emailReducer(before, {
      type: 'selectMessage',
      ref: 'c',
      requestId: 2,
    });
    expect(state.message).toBeNull();
    state = emailReducer(state, {
      type: 'setMessageResult',
      ref: 'c',
      requestId: 2,
      result: { status: 'failure', message: 'Safe failure' },
    });
    expect(state.messages).toBe(before.messages);
    expect(state.selectedRef).toBe('c');
    expect(state.detail).toEqual({ loading: false, error: 'Safe failure' });
  });
  it('ignores outdated successes and failures, even after selecting the same row again', () => {
    let state = emailReducer(loaded(), {
      type: 'selectMessage',
      ref: 'c',
      requestId: 2,
    });
    for (const result of [
      { status: 'success', data: full },
      { status: 'failure', message: 'Old failure' },
    ] as const) {
      expect(
        emailReducer(state, {
          type: 'setMessageResult',
          ref: 'b',
          requestId: 1,
          result,
        }),
      ).toBe(state);
    }
    state = emailReducer(state, {
      type: 'selectMessage',
      ref: 'b',
      requestId: 3,
    });
    expect(
      emailReducer(state, {
        type: 'setMessageResult',
        ref: 'b',
        requestId: 1,
        result: { status: 'success', data: full },
      }),
    ).toBe(state);
    state = emailReducer(state, {
      type: 'setMessageResult',
      ref: 'b',
      requestId: 3,
      result: { status: 'success', data: full },
    });
    expect(state.message).toBe(full);
    expect(state.detail.loading).toBe(false);
  });
  it('reports missing connection and clears the state after a successful retry', () => {
    let state = emailReducer(initialEmailState, {
      type: 'setPageResult',
      operation: 'initial',
      result: { status: 'noConnection' },
    });
    expect(state.noConnection).toBe(true);
    state = emailReducer(state, {
      type: 'startPageLoad',
      operation: 'initial',
    });
    expect(state.initial.error).toBeNull();
    state = emailReducer(state, {
      type: 'setPageResult',
      operation: 'initial',
      result: {
        status: 'success',
        data: { messages: [], nextPageToken: null },
      },
    });
    expect(state.noConnection).toBe(false);
    expect(state.initial.loading).toBe(false);
  });
});
