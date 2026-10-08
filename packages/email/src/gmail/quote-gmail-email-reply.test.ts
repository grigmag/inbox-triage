import { describe, expect, it } from 'vitest';
import { quoteGmailEmailReply } from './quote-gmail-email-reply';

// A copy of the English attribution pattern in the dashboard's
// split-quoted-email-text.ts, which hides quoted history in the email detail.
const DASHBOARD_ATTRIBUTION_LINE = /^On\s.*\d.*\swrote:$/;

const parent = {
  from: [{ name: 'Jane Doe', address: 'jane@example.com' }],
  to: [{ name: null, address: 'studio@example.com' }],
  cc: [],
  subject: 'Project idea',
  sentAt: new Date('2026-09-29T11:05:30.000Z'),
  receivedAt: new Date('2026-09-29T11:06:00.000Z'),
  text: 'We need ten product photographs.\r\n\r\nThanks,\r\nJane\r\n',
  html: '<div dir="ltr">We need ten product photographs.<div><br></div><div>Thanks,</div><div>Jane</div></div>',
};
const timezone = 'Europe/Athens';

describe('quoteGmailEmailReply', () => {
  it('appends the attribution and the `>`-prefixed original to the unchanged reply text', () => {
    const { text } = quoteGmailEmailReply(
      parent,
      'Hello Jane,\n\nThanks.',
      timezone,
    );

    expect(text).toBe(
      [
        'Hello Jane,',
        '',
        'Thanks.',
        '',
        'On Tue, 29 Sept 2026 at 14:05, Jane Doe <jane@example.com> wrote:',
        '',
        '> We need ten product photographs.',
        '>',
        '> Thanks,',
        '> Jane',
        '',
      ].join('\n'),
    );
  });

  it('writes an attribution that the dashboard recognizes as quoted history', () => {
    const attributions = [
      parent,
      { ...parent, from: [{ name: null, address: 'jane@example.com' }] },
      { ...parent, from: [] },
    ].map(
      (message) =>
        quoteGmailEmailReply(message, 'Hi', timezone).text.split('\n')[2],
    );

    expect(attributions).toEqual([
      'On Tue, 29 Sept 2026 at 14:05, Jane Doe <jane@example.com> wrote:',
      'On Tue, 29 Sept 2026 at 14:05, <jane@example.com> wrote:',
      'On Tue, 29 Sept 2026 at 14:05 wrote:',
    ]);
    for (const attribution of attributions) {
      expect(attribution).toMatch(DASHBOARD_ATTRIBUTION_LINE);
    }
  });

  it('formats the date in the given time zone and falls back to the received date', () => {
    const lateNight = {
      ...parent,
      sentAt: new Date('2026-01-05T23:15:00.000Z'),
    };

    expect(quoteGmailEmailReply(lateNight, 'Hi', timezone).text).toContain(
      '\nOn Tue, 6 Jan 2026 at 01:15, Jane Doe',
    );
    expect(quoteGmailEmailReply(lateNight, 'Hi', 'UTC').text).toContain(
      '\nOn Mon, 5 Jan 2026 at 23:15, Jane Doe',
    );
    expect(
      quoteGmailEmailReply({ ...parent, sentAt: null }, 'Hi', timezone).text,
    ).toContain('\nOn Tue, 29 Sept 2026 at 14:06, Jane Doe');
  });

  it('quotes the original HTML in a gmail_quote blockquote below the escaped reply', () => {
    const { html } = quoteGmailEmailReply(
      {
        ...parent,
        from: [{ name: 'A & B', address: 'jane@example.com' }],
        html: '<html><head><style>p { display: none; }</style></head><body><p>Hi<img src="cid:logo"></p></body></html>',
      },
      '<script>alert("x")</script>\n\nKind regards,',
      timezone,
    );

    expect(html).toBe(
      '<div dir="ltr" style="white-space: pre-wrap;"><div>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</div><div><br></div><div>Kind regards,</div></div>' +
        '<br>' +
        '<div class="gmail_quote">' +
        '<div dir="ltr" class="gmail_attr">On Tue, 29 Sept 2026 at 14:05, A &amp; B &lt;<a href="mailto:jane@example.com">jane@example.com</a>&gt; wrote:<br></div>' +
        '<blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">' +
        '<p>Hi</p>' +
        '</blockquote></div>',
    );
  });

  it('quotes an escaped plain-text original in the HTML part when it has no HTML', () => {
    const { html } = quoteGmailEmailReply(
      { ...parent, text: 'Budget < 5k\r\nThanks', html: null },
      'Hi',
      timezone,
    );

    expect(html).toContain(
      'padding-left:1ex"><div style="white-space: pre-wrap;">Budget &lt; 5k<br>Thanks</div></blockquote>',
    );
  });

  it('leaves the text part as the reply alone when the original has no text', () => {
    const { text, html } = quoteGmailEmailReply(
      { ...parent, text: null, html: '<p>Only HTML</p>' },
      'Hi',
      timezone,
    );

    expect(text).toBe('Hi');
    expect(html).toContain('padding-left:1ex"><p>Only HTML</p></blockquote>');
  });
});
