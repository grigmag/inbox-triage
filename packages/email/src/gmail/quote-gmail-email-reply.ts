import {
  escapeHtml,
  normalizeLineBreaks,
  PRESERVE_WHITESPACE,
  quotableHtml,
  textToHtml,
  textToHtmlLines,
  type QuotedParent,
} from '../reply/quote-helpers';

// Gmail's English (UK) month names, which abbreviate September to "Sept".
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sept',
  'Oct',
  'Nov',
  'Dec',
];

const BLOCKQUOTE_STYLE =
  'margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex';

/**
 * Builds reply bodies that quote the parent message the way Gmail's web
 * client does: the new text, an "On <date>, <name> <email> wrote:"
 * attribution, and the original below it. The text part prefixes each line
 * of the original with `>`. The HTML part puts the original in a
 * `gmail_quote` blockquote, which Gmail collapses when showing the thread.
 * The reply text starts the text part unchanged. The original HTML is quoted
 * from the contents of its `body` element, without its style sheets or inline
 * images.
 */
export function quoteGmailEmailReply(
  parent: QuotedParent,
  replyText: string,
  timezone: string,
): { text: string; html: string } {
  const date = formatAttributionDate(
    parent.sentAt ?? parent.receivedAt,
    timezone,
  );
  const sender = parent.from.at(0);

  const text =
    parent.text === null
      ? replyText
      : `${replyText}\n\n${textAttribution(date, sender)}\n\n${quoteTextLines(
          parent.text,
        )}\n`;

  const original =
    parent.html === null
      ? `<div style="${PRESERVE_WHITESPACE}">${textToHtml(parent.text ?? '')}</div>`
      : quotableHtml(parent.html);

  const html =
    `<div dir="ltr" style="${PRESERVE_WHITESPACE}">${textToHtmlLines(replyText)}</div>` +
    '<br>' +
    '<div class="gmail_quote">' +
    `<div dir="ltr" class="gmail_attr">${htmlAttribution(date, sender)}<br></div>` +
    `<blockquote class="gmail_quote" style="${BLOCKQUOTE_STYLE}">` +
    original +
    '</blockquote></div>';

  return { text, html };
}

type Sender = QuotedParent['from'][number] | undefined;

// "On Tue, 29 Sept 2026 at 14:05, Jane Doe <jane@example.com> wrote:".
function textAttribution(date: string, sender: Sender): string {
  if (!sender) {
    return `On ${date} wrote:`;
  }

  const address = `<${sender.address}>`;
  return `On ${date}, ${sender.name ? `${sender.name} ${address}` : address} wrote:`;
}

// Gmail links the address in the HTML attribution.
function htmlAttribution(date: string, sender: Sender): string {
  if (!sender) {
    return `On ${escapeHtml(date)} wrote:`;
  }

  const address = `&lt;<a href="mailto:${escapeHtml(sender.address)}">${escapeHtml(
    sender.address,
  )}</a>&gt;`;
  const who = sender.name ? `${escapeHtml(sender.name)} ${address}` : address;
  return `On ${escapeHtml(date)}, ${who} wrote:`;
}

// Gmail prefixes each line with "> " and an empty line with ">".
function quoteTextLines(text: string): string {
  return normalizeLineBreaks(text)
    .replace(/\n+$/, '')
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n');
}

// For example, "Tue, 29 Sept 2026 at 14:05".
function formatAttributionDate(date: Date, timezone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  const month = MONTHS[Number(parts.month) - 1];

  return `${parts.weekday}, ${parts.day} ${month} ${parts.year} at ${parts.hour}:${parts.minute}`;
}
