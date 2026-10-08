import {
  escapeHtml,
  normalizeLineBreaks,
  PRESERVE_WHITESPACE,
  quotableHtml,
  textToHtml,
  textToHtmlLines,
  type QuotedParent,
} from '../reply/quote-helpers';

/**
 * Builds reply bodies that quote the parent message the way Zoho Mail does
 * with its full reply header style: the new text, the original's From, To, Cc,
 * Date, and Subject, and the original below them. Like Zoho, the text part
 * does not prefix the original with `>`. The reply text starts the text part
 * unchanged. The original HTML is quoted from the contents of its `body`
 * element, without its style sheets or inline images.
 */
export function quoteZohoEmailReply(
  parent: QuotedParent,
  replyText: string,
  timezone: string,
): { text: string; html: string } {
  const header = quoteHeader(parent, timezone);

  const text =
    parent.text === null
      ? replyText
      : `${replyText}\n\n\n\n${header.join('\n')}\n\n${normalizeLineBreaks(
          parent.text,
        ).replace(/\n+$/, '')}\n`;

  const original =
    parent.html === null
      ? `<div style="${PRESERVE_WHITESPACE}">${textToHtml(parent.text ?? '')}</div>`
      : quotableHtml(parent.html);

  const html =
    '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><html><head>' +
    '<meta content="text/html;charset=UTF-8" http-equiv="Content-Type">' +
    '</head><body>' +
    '<div style="font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10pt;">' +
    `<div style="${PRESERVE_WHITESPACE}">${textToHtmlLines(replyText)}</div>` +
    '<div><br></div>' +
    '<div class="zmail_extra_hr" style="border-top: 1px solid rgb(204, 204, 204); height: 0px; margin-top: 10px; margin-bottom: 10px; line-height: 0px;"><br></div>' +
    '<div class="zmail_extra" data-zbluepencil-ignore="true">' +
    '<div><br></div>' +
    '<div id="Zm-_Id_-Sgn1">' +
    header.map((line) => `${escapeHtml(line)}<br>`).join('') +
    '</div>' +
    '<div><br></div>' +
    '<blockquote style="margin: 0px;" id="blockquote_zmail"><div>' +
    original +
    '</div></blockquote></div><div><br></div></div><br></body></html>';

  return { text, html };
}

// Lines such as "From: Maria <client@example.com>". Zoho keeps the angle
// brackets around an address that has no name.
function quoteHeader(parent: QuotedParent, timezone: string): string[] {
  const addresses = (values: QuotedParent['from']) =>
    values
      .map(({ name, address }) =>
        name ? `${name} <${address}>` : `<${address}>`,
      )
      .join(', ');
  const header = [
    `From: ${addresses(parent.from)}`,
    `To: ${addresses(parent.to)}`,
  ];

  if (parent.cc.length > 0) {
    header.push(`Cc: ${addresses(parent.cc)}`);
  }

  header.push(
    `Date: ${formatHeaderDate(parent.sentAt ?? parent.receivedAt, timezone)}`,
  );

  if (parent.subject !== null) {
    header.push(`Subject: ${parent.subject}`);
  }

  return header;
}

// For example, "Mon, 22 Sep 2026 11:29:00 +0300", the RFC 5322 date format.
function formatHeaderDate(date: Date, timezone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  // longOffset is "GMT" at zero and "GMT+03:00" otherwise.
  const offset =
    parts.timeZoneName.replace('GMT', '').replace(':', '') || '+0000';

  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year} ${parts.hour}:${parts.minute}:${parts.second} ${offset}`;
}
