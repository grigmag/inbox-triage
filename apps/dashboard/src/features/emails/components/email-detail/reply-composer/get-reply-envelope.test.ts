import { describe, expect, it } from 'vitest';
import type { EmailMessageDto } from '@/features/emails/dto/email.dto';
import { getReplyRecipients, getReplySubject } from './get-reply-envelope';

const sender = { name: 'Maria', address: 'maria@example.com' };
const replyTo = { name: null, address: 'bookings@example.com' };

function message(overrides: Partial<EmailMessageDto> = {}): EmailMessageDto {
  return {
    ref: 'ref-1',
    from: [sender],
    subject: 'Shoot',
    receivedAt: '2026-01-01T00:00:00.000Z',
    isRead: true,
    to: [],
    cc: [],
    replyTo: [],
    sentAt: null,
    text: null,
    ...overrides,
  };
}

describe('getReplyRecipients', () => {
  it('prefers the Reply-To addresses', () => {
    expect(getReplyRecipients(message({ replyTo: [replyTo] }))).toEqual([
      replyTo,
    ]);
  });

  it('falls back to the sender', () => {
    expect(getReplyRecipients(message())).toEqual([sender]);
  });
});

describe('getReplySubject', () => {
  it('adds a Re: prefix', () => {
    expect(getReplySubject('Shoot')).toBe('Re: Shoot');
  });

  it('keeps an existing prefix in any case', () => {
    expect(getReplySubject('RE: Shoot')).toBe('RE: Shoot');
  });

  it('labels a missing subject', () => {
    expect(getReplySubject(null)).toBe('No subject');
  });
});
