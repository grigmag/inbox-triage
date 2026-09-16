import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { EmailSummary } from '../email-message.types';
import { parseEmailMessage } from './parse-email-message';

const summary: EmailSummary = {
  ref: 'opaque-reference',
  from: [{ name: 'Envelope sender', address: 'sender@example.com' }],
  subject: 'Envelope subject',
  receivedAt: new Date('2026-09-09T06:00:00.000Z'),
  isRead: false,
  sizeBytes: 500,
};

describe('parseEmailMessage', () => {
  it('maps plain text headers and content into package-owned fields', async () => {
    const message = await parseEmailMessage(
      await fixture('plain-text.eml'),
      summary,
    );

    expect(message).toMatchObject({
      ...summary,
      messageId: '<plain-1@example.com>',
      to: [{ name: 'Studio', address: 'studio@example.com' }],
      cc: [{ name: 'Producer', address: 'producer@example.com' }],
      replyTo: [{ name: null, address: 'replies@example.com' }],
      sentAt: new Date('2026-09-08T07:30:00.000Z'),
      text: 'Could you quote a two-day photo shoot?\n',
      html: null,
    });
  });

  it('returns both alternatives for a multipart message', async () => {
    const message = await parseEmailMessage(
      await fixture('html-and-text.eml'),
      summary,
    );

    expect(message.text).toBe('The campaign starts next month.\n');
    expect(message.html).toContain('<strong>next month</strong>');
  });

  it('uses nulls and empty address arrays for missing optional fields', async () => {
    const message = await parseEmailMessage(
      await fixture('missing-fields.eml'),
      summary,
    );

    expect(message).toMatchObject({
      messageId: null,
      to: [],
      cc: [],
      replyTo: [],
      sentAt: null,
      html: null,
    });
  });
});

function fixture(name: string): Promise<Buffer> {
  return readFile(new URL(`../../test-fixtures/${name}`, import.meta.url));
}
