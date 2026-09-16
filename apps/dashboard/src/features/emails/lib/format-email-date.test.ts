import { describe, expect, it } from 'vitest';
import { formatEmailDate } from './format-email-date';

describe('formatEmailDate', () => {
  it('formats the local time for a message received today', () => {
    const now = new Date(2026, 8, 15, 12, 0);
    const receivedAt = new Date(2026, 8, 15, 9, 5);

    expect(formatEmailDate(receivedAt.toISOString(), { now })).toBe('09:05');
  });

  it('formats the local date for an older message', () => {
    const now = new Date(2026, 8, 15, 12, 0);
    const receivedAt = new Date(2026, 0, 2, 9, 5);

    expect(formatEmailDate(receivedAt.toISOString(), { now })).toBe(
      '02/01/2026',
    );
  });

  it('formats the local date and time for message detail', () => {
    const receivedAt = new Date(2026, 0, 2, 9, 5);

    expect(formatEmailDate(receivedAt.toISOString(), { detail: true })).toBe(
      '02/01/2026 09:05',
    );
  });
});
