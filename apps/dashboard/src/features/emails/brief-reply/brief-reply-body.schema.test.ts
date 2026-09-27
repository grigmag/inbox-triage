import { describe, expect, it } from 'vitest';
import { briefReplyBodySchema } from './brief-reply-body.schema';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from './brief-reply.config';

describe('briefReplyBodySchema', () => {
  it('accepts a body unchanged, including surrounding whitespace', () => {
    const body = '\n  Hello,\n\nWhen is the shoot?\n\nKind regards,\n';

    expect(briefReplyBodySchema.parse(body)).toBe(body);
  });

  it('accepts a body at the length limit', () => {
    const body = 'a'.repeat(BRIEF_REPLY_MAX_BODY_LENGTH);

    expect(briefReplyBodySchema.safeParse(body).success).toBe(true);
  });

  it.each([
    ['an empty body', ''],
    ['a whitespace-only body', ' \n\t '],
    ['an oversized body', 'a'.repeat(BRIEF_REPLY_MAX_BODY_LENGTH + 1)],
    ['a non-string body', 42],
    ['an absent body', undefined],
  ])('rejects %s', (_, body) => {
    expect(briefReplyBodySchema.safeParse(body).success).toBe(false);
  });
});
