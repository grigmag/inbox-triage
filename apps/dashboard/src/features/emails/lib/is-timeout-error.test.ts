import { describe, expect, it } from 'vitest';
import { isTimeoutError } from './is-timeout-error';

function namedError(name: string, cause?: unknown): Error {
  const error = new Error('details', { cause });
  error.name = name;
  return error;
}

describe('isTimeoutError', () => {
  it.each(['TimeoutError', 'AbortError'])('detects a %s', (name) => {
    expect(isTimeoutError(namedError(name))).toBe(true);
  });

  it('detects a timeout in the cause chain', () => {
    const error = namedError(
      'Error',
      namedError('Error', namedError('TimeoutError')),
    );

    expect(isTimeoutError(error)).toBe(true);
  });

  it('rejects other errors and non-errors', () => {
    expect(isTimeoutError(namedError('Error'))).toBe(false);
    expect(isTimeoutError({ name: 'TimeoutError' })).toBe(false);
  });
});
