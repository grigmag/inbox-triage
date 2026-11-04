import { describe, expect, it } from 'vitest';
import { splitQuotedEmailText } from './split-quoted-email-text';

const lines = (...values: string[]) => values.join('\n');

describe('splitQuotedEmailText', () => {
  it('returns the whole text when there is no quoted history', () => {
    const text = lines('Hi,', '', 'We need 20 product shots.', '', 'Maria', '');

    expect(splitQuotedEmailText(text)).toEqual({
      body: lines('Hi,', '', 'We need 20 product shots.', '', 'Maria'),
      quoted: null,
    });
  });

  it('splits a Gmail reply with a wrapped attribution', () => {
    const text = lines(
      'Hi,',
      '',
      "After discussion, I think we'll go with 30 product shots.",
      '',
      'Thanks,',
      'Maria Doukas',
      'Kallisto Coffee Roasters',
      '',
      'On Fri, 25 Sept 2026 at 23:21, John Doe from Northlight Studio <',
      'john@example.com> wrote:',
      '',
      '> Hi,',
      '> Would you like us to handle casting and talent arrangements?',
      '>',
      '> Best regards',
      '>',
      '>',
      '',
    );

    expect(splitQuotedEmailText(text)).toEqual({
      body: lines(
        'Hi,',
        '',
        "After discussion, I think we'll go with 30 product shots.",
        '',
        'Thanks,',
        'Maria Doukas',
        'Kallisto Coffee Roasters',
      ),
      quoted: lines(
        'On Fri, 25 Sept 2026 at 23:21, John Doe from Northlight Studio <',
        'john@example.com> wrote:',
        '',
        '> Hi,',
        '> Would you like us to handle casting and talent arrangements?',
        '>',
        '> Best regards',
        '>',
        '>',
      ),
    });
  });

  it('splits a single-line Apple Mail attribution', () => {
    const text = lines(
      'Sounds good.',
      '',
      'On 25 Sep 2026, at 23:21, Studio <studio@example.com> wrote:',
      '',
      '> Can we shoot on Monday?',
    );

    expect(splitQuotedEmailText(text)).toEqual({
      body: 'Sounds good.',
      quoted: lines(
        'On 25 Sep 2026, at 23:21, Studio <studio@example.com> wrote:',
        '',
        '> Can we shoot on Monday?',
      ),
    });
  });

  it.each([
    [
      'Greek',
      'Στις Παρ 25 Σεπ 2026 στις 11:21 μ.μ., ο/η Studio <studio@example.com> έγραψε:',
    ],
    [
      'German',
      'Am Fr., 25. Sept. 2026 um 23:21 Uhr schrieb Studio <studio@example.com>:',
    ],
    [
      'French',
      'Le ven. 25 sept. 2026 à 23:21, Studio <studio@example.com> a écrit :',
    ],
    [
      'Spanish',
      'El vie, 25 sept 2026 a las 23:21, Studio (<studio@example.com>) escribió:',
    ],
  ])('splits a %s attribution', (_language, attribution) => {
    const text = lines('Ευχαριστώ!', '', attribution, '', '> Καλησπέρα,');

    expect(splitQuotedEmailText(text)).toEqual({
      body: 'Ευχαριστώ!',
      quoted: lines(attribution, '', '> Καλησπέρα,'),
    });
  });

  it('splits a Zoho short reply header followed by the unprefixed original', () => {
    const text = lines(
      'Confirmed for Monday.',
      '',
      '---- On Fri, 25 Sep 2026 23:21:00 +0300 Maria <maria@example.com> wrote ----',
      '',
      'Can we shoot on Monday?',
    );

    expect(splitQuotedEmailText(text)).toEqual({
      body: 'Confirmed for Monday.',
      quoted: lines(
        '---- On Fri, 25 Sep 2026 23:21:00 +0300 Maria <maria@example.com> wrote ----',
        '',
        'Can we shoot on Monday?',
      ),
    });
  });

  it('splits the header block this app quotes the original under', () => {
    // The layout quoteZohoEmailReply writes to the text part.
    const quoted = lines(
      'From: Maria Doukas <maria@example.com>',
      'To: Northlight Studio <studio@example.com>',
      'Cc: <producer@example.com>',
      'Date: Mon, 22 Sep 2026 11:29:00 +0300',
      'Subject: Coffee campaign',
      '',
      'Hi,',
      '',
      'We need 30 product shots.',
    );
    const text = `Thanks, we will send an offer tomorrow.\n\n\n\n${quoted}\n`;

    expect(splitQuotedEmailText(text)).toEqual({
      body: 'Thanks, we will send an offer tomorrow.',
      quoted,
    });
  });

  it('starts the quote at a Zoho separator above the header block', () => {
    const quoted = lines(
      '============ Forwarded message ============',
      'From: Maria <maria@example.com>',
      'To: <studio@example.com>',
      'Date: Mon, 22 Sep 2026 11:29:00 +0300',
      'Subject: Coffee campaign',
      '============ Forwarded message ============',
      '',
      'Brief attached.',
    );

    expect(splitQuotedEmailText(lines('FYI', '', quoted))).toEqual({
      body: 'FYI',
      quoted,
    });
  });

  it('splits an Outlook original message separator and header block', () => {
    const quoted = lines(
      '-----Original Message-----',
      'From: Maria Doukas <maria@example.com>',
      'Sent: Monday, September 22, 2026 11:29 AM',
      'To: Northlight Studio <studio@example.com>',
      'Subject: Coffee campaign',
      '',
      'Can we shoot on Monday?',
    );

    expect(
      splitQuotedEmailText(lines('Yes, Monday works.', '', quoted)),
    ).toEqual({ body: 'Yes, Monday works.', quoted });
  });

  it('splits an Outlook underscore separator and bold header block', () => {
    const quoted = lines(
      '________________________________',
      '*From:* Maria Doukas <maria@example.com>',
      '*Sent:* Monday, September 22, 2026 11:29 AM',
      '*To:* Northlight Studio <studio@example.com>;',
      'Producer <producer@example.com>',
      '*Subject:* Coffee campaign',
      '',
      'Can we shoot on Monday?',
    );

    expect(splitQuotedEmailText(lines('Yes.', '', quoted))).toEqual({
      body: 'Yes.',
      quoted,
    });
  });

  it('keeps an underscore line that is not followed by a header block', () => {
    const text = lines(
      'Thanks,',
      '________________________________',
      'Maria Doukas | Kallisto Coffee Roasters',
    );

    expect(splitQuotedEmailText(text)).toEqual({ body: text, quoted: null });
  });

  it('keeps From and To lines that are not a header block', () => {
    const text = lines(
      'Delivery details:',
      'From: our warehouse in Piraeus',
      'To: your studio in Athens',
      '',
      'Thanks',
    );

    expect(splitQuotedEmailText(text)).toEqual({ body: text, quoted: null });
  });

  it('splits a trailing run of quoted lines without an attribution', () => {
    const text = lines(
      'Agreed.',
      '',
      '> Shall we add a second day?',
      '>',
      '',
      '> Best,',
      '> Studio',
      '',
    );

    expect(splitQuotedEmailText(text)).toEqual({
      body: 'Agreed.',
      quoted: lines(
        '> Shall we add a second day?',
        '>',
        '',
        '> Best,',
        '> Studio',
      ),
    });
  });

  it('keeps a quoted line in the middle of new content', () => {
    const text = lines(
      'About your question:',
      '> Do you need a stylist?',
      'Yes, please book one.',
      '',
      'Maria',
    );

    expect(splitQuotedEmailText(text)).toEqual({ body: text, quoted: null });
  });

  it('keeps inline replies below an attribution and splits only the tail', () => {
    const text = lines(
      'Answers below.',
      '',
      'On Fri, 25 Sept 2026 at 23:21, Studio <studio@example.com> wrote:',
      '> How many images?',
      '30 images.',
      '',
      '> Thanks',
    );

    expect(splitQuotedEmailText(text)).toEqual({
      body: lines(
        'Answers below.',
        '',
        'On Fri, 25 Sept 2026 at 23:21, Studio <studio@example.com> wrote:',
        '> How many images?',
        '30 images.',
      ),
      quoted: '> Thanks',
    });
  });

  it('does not split on "wrote:" inside a paragraph', () => {
    const text = lines(
      'On the call, our director said she wrote:',
      'a shot list for the campaign.',
      '',
      '> not a trailing quote',
      'More new text.',
    );

    expect(splitQuotedEmailText(text)).toEqual({ body: text, quoted: null });
  });

  it('returns only-quoted text as the body with no quoted part', () => {
    const text = lines(
      'On Fri, 25 Sept 2026 at 23:21, Studio <studio@example.com> wrote:',
      '> Hi,',
      '> Can we shoot on Monday?',
      '',
    );

    expect(splitQuotedEmailText(text)).toEqual({
      body: lines(
        'On Fri, 25 Sept 2026 at 23:21, Studio <studio@example.com> wrote:',
        '> Hi,',
        '> Can we shoot on Monday?',
      ),
      quoted: null,
    });
  });

  it('normalizes CRLF line endings', () => {
    const text =
      'Sounds good.\r\n\r\nOn Fri, 25 Sept 2026 at 23:21, Studio <studio@example.com> wrote:\r\n\r\n> Can we shoot?\r\n>\r\n';

    expect(splitQuotedEmailText(text)).toEqual({
      body: 'Sounds good.',
      quoted: lines(
        'On Fri, 25 Sept 2026 at 23:21, Studio <studio@example.com> wrote:',
        '',
        '> Can we shoot?',
        '>',
      ),
    });
  });
});
