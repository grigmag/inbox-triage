import { describe, expect, it } from 'vitest';
import { parseMessageRef } from './message-ref';
import { normalizeEmailSummary } from './normalize-email-summary';

describe('normalizeEmailSummary', () => {
  it('maps supported IMAP fields and drops addresses without an address', () => {
    const receivedAt = new Date('2026-09-09T06:00:00.000Z');
    const result = normalizeEmailSummary(
      {
        uid: 15,
        from: [
          { name: ' Client ', address: ' client@example.com ' },
          { name: 'Missing' },
        ],
        receivedAt,
        flags: new Set(['\\Seen']),
        sizeBytes: 321,
      },
      BigInt(8),
    );

    expect(result).toMatchObject({
      from: [{ name: 'Client', address: 'client@example.com' }],
      subject: null,
      receivedAt,
      isRead: true,
      sizeBytes: 321,
    });
    expect(parseMessageRef(result.ref)).toEqual({
      uidValidity: BigInt(8),
      uid: 15,
    });
  });
});
