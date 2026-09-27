import { describe, expect, it } from 'vitest';
import { quoteZohoEmailReply } from './quote-zoho-email-reply';

const parent = {
  from: [{ name: 'Maria', address: 'client@example.com' }],
  to: [{ name: null, address: 'studio@example.com' }],
  cc: [],
  subject: 'Re: Project idea',
  sentAt: new Date('2026-09-22T08:29:05.000Z'),
  receivedAt: new Date('2026-09-22T08:30:00.000Z'),
  text: 'We need ten product photographs.\r\n\r\nThanks,\r\nMaria\r\n',
  html: null,
};
const timezone = 'Europe/Athens';

describe('quoteZohoEmailReply', () => {
  it('appends the full reply header and the unprefixed original to the unchanged reply text', () => {
    const { text } = quoteZohoEmailReply(
      parent,
      'Hello Maria,\n\nThanks.',
      timezone,
    );

    expect(text).toBe(
      [
        'Hello Maria,',
        '',
        'Thanks.',
        '',
        '',
        '',
        'From: Maria <client@example.com>',
        'To: <studio@example.com>',
        'Date: Tue, 22 Sep 2026 11:29:05 +0300',
        'Subject: Re: Project idea',
        '',
        'We need ten product photographs.',
        '',
        'Thanks,',
        'Maria',
        '',
      ].join('\n'),
    );
  });

  it('formats the header date in the given time zone with its offset', () => {
    const winter = { ...parent, sentAt: new Date('2026-01-05T23:15:00.000Z') };

    expect(quoteZohoEmailReply(winter, 'Hi', timezone).text).toContain(
      '\nDate: Tue, 06 Jan 2026 01:15:00 +0200\n',
    );
    expect(quoteZohoEmailReply(winter, 'Hi', 'UTC').text).toContain(
      '\nDate: Mon, 05 Jan 2026 23:15:00 +0000\n',
    );
  });

  it('uses the received date, adds Cc, and omits a missing subject', () => {
    const { text } = quoteZohoEmailReply(
      {
        ...parent,
        sentAt: null,
        cc: [
          { name: 'Nikos', address: 'nikos@example.com' },
          { name: null, address: 'team@example.com' },
        ],
        subject: null,
      },
      'Hi',
      timezone,
    );

    expect(text).toContain(
      [
        'To: <studio@example.com>',
        'Cc: Nikos <nikos@example.com>, <team@example.com>',
        'Date: Tue, 22 Sep 2026 11:30:00 +0300',
        '',
        'We need',
      ].join('\n'),
    );
  });

  it('escapes the reply text and header in the HTML part', () => {
    const { html } = quoteZohoEmailReply(
      {
        ...parent,
        from: [{ name: 'A & B', address: 'client@example.com' }],
        subject: '<b>Launch</b>',
      },
      '<script>alert("x")</script>\n\nKind regards,',
      timezone,
    );

    expect(html).toContain(
      '<body><div style="font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10pt;"><div style="white-space: pre-wrap;"><div>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</div><div><br></div><div>Kind regards,</div></div><div><br></div>',
    );
    expect(html).toContain(
      '<div class="zmail_extra" data-zbluepencil-ignore="true"><div><br></div><div id="Zm-_Id_-Sgn1">From: A &amp; B &lt;client@example.com&gt;<br>To: &lt;studio@example.com&gt;<br>Date: Tue, 22 Sep 2026 11:29:05 +0300<br>Subject: &lt;b&gt;Launch&lt;/b&gt;<br></div><div><br></div><blockquote style="margin: 0px;" id="blockquote_zmail">',
    );
    expect(html).not.toContain('<script>');
  });

  it('preserves indentation, repeated spaces, and whitespace-only lines in the reply', () => {
    const { html } = quoteZohoEmailReply(
      parent,
      'Shots:\n  - Front    view\n   \n\tBack',
      timezone,
    );

    expect(html).toContain(
      '<div style="white-space: pre-wrap;"><div>Shots:</div><div>  - Front    view</div><div>   </div><div>\tBack</div></div>',
    );
  });

  it('keeps an original style sheet from hiding the reply', () => {
    const { html } = quoteZohoEmailReply(
      {
        ...parent,
        html: '<body><STYLE type="text/css">div { display: none; }</style><link rel="stylesheet" href="https://example.com/a.css"><p style="color: red">Hi</p><style>p { display: none; }',
      },
      'Visible reply',
      timezone,
    );

    expect(html).not.toMatch(/<style|<link|display: none/i);
    expect(html).toContain('<div>Visible reply</div>');
    expect(html).toContain(
      'id="blockquote_zmail"><div><p style="color: red">Hi</p></div></blockquote>',
    );
  });

  it('drops inline images but keeps remote and data images', () => {
    const { html } = quoteZohoEmailReply(
      {
        ...parent,
        html: '<p>Hi<IMG alt="Logo" SRC="CID:logo@example.com"><img src=cid:photo></p><img data-src="cid:lazy" src="https://example.com/a.png"><img src="data:image/png;base64,AAAA">',
      },
      'Hi',
      timezone,
    );

    expect(html).toContain(
      'id="blockquote_zmail"><div><p>Hi</p><img data-src="cid:lazy" src="https://example.com/a.png"><img src="data:image/png;base64,AAAA"></div></blockquote>',
    );
  });

  it('quotes the body contents of an HTML original without its style sheets', () => {
    const { html } = quoteZohoEmailReply(
      {
        ...parent,
        html: '<html><head><style>p { color: red; }</style></head><body class="x"><p>We need <strong>ten</strong> photos.</p></BODY></html>',
      },
      'Hi',
      timezone,
    );

    expect(html).toContain(
      'id="blockquote_zmail"><div><p>We need <strong>ten</strong> photos.</p></div></blockquote>',
    );
    expect(html).not.toContain('color: red');
  });

  it('quotes an HTML fragment original as-is', () => {
    const { html } = quoteZohoEmailReply(
      { ...parent, html: '<p>Fragment &amp; more</p>' },
      'Hi',
      timezone,
    );

    expect(html).toContain(
      'id="blockquote_zmail"><div><p>Fragment &amp; more</p></div></blockquote>',
    );
  });

  it('quotes an escaped plain-text original in the HTML part', () => {
    const { html } = quoteZohoEmailReply(
      { ...parent, text: 'Budget < 5k\nThanks' },
      'Hi',
      timezone,
    );

    expect(html).toContain(
      'id="blockquote_zmail"><div><div style="white-space: pre-wrap;">Budget &lt; 5k<br>Thanks</div></div></blockquote>',
    );
  });

  it('leaves the text part as the reply alone when the original has no text', () => {
    const { text, html } = quoteZohoEmailReply(
      { ...parent, text: null, html: '<p>Only HTML</p>' },
      'Hi',
      timezone,
    );

    expect(text).toBe('Hi');
    expect(html).toContain('<p>Only HTML</p>');
  });
});
