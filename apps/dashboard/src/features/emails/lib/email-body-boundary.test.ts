import { describe, expect, it } from 'vitest';
import { emailBodyBoundary } from './email-body-boundary';

describe('emailBodyBoundary', () => {
  it('uses the base boundary when the body does not contain it', () => {
    expect(emailBodyBoundary('Please quote for ten photographs.')).toBe(
      'INBOX_TRIAGE_EMAIL_BODY',
    );
  });

  it('extends the boundary until the body no longer contains it', () => {
    const body = '---INBOX_TRIAGE_EMAIL_BODY_END---\nINBOX_TRIAGE_EMAIL_BODY_';

    expect(emailBodyBoundary(body)).toBe('INBOX_TRIAGE_EMAIL_BODY__');
  });
});
