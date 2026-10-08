import type { EmailMessage } from '../email-message.types';

/** Keeps indentation, repeated spaces, and whitespace-only lines of plain text. */
export const PRESERVE_WHITESPACE = 'white-space: pre-wrap;';

/** The parent message fields that reply formatters quote. */
export type QuotedParent = Pick<
  EmailMessage,
  'from' | 'to' | 'cc' | 'subject' | 'sentAt' | 'receivedAt' | 'text' | 'html'
>;

/**
 * The original HTML to place inside a reply's quote: the contents of its
 * `body` element, without its style sheets or inline images.
 */
export function quotableHtml(html: string): string {
  return withoutInlineImages(withoutStyleSheets(htmlBodyContent(html)));
}

function htmlBodyContent(html: string): string {
  const open = /<body\b[^>]*>/i.exec(html);

  if (!open) {
    return html;
  }

  const content = html.slice(open.index + open[0].length);
  const close = content.search(/<\/body\s*>/i);
  return close === -1 ? content : content.slice(0, close);
}

// Style sheets apply to the whole document, so an original's CSS could restyle
// or hide the new reply. Inline style attributes only affect their own element
// and stay. An unclosed style element runs to the end of the original.
function withoutStyleSheets(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?(?:<\/style\s*>|$)/gi, '')
    .replace(/<link\b[^>]*>/gi, '');
}

// Inline images point at the original's MIME parts through `cid:` URLs, and
// the reply does not carry those parts, so they would show as broken.
function withoutInlineImages(html: string): string {
  return html.replace(/<img\b[^>]*\ssrc\s*=\s*["']?\s*cid:[^>]*>/gi, '');
}

/**
 * Escaped text with each line as its own `div` and blank lines as
 * `<div><br></div>`, the way Zoho Mail and Gmail write composed text.
 */
export function textToHtmlLines(text: string): string {
  return normalizeLineBreaks(text)
    .split('\n')
    .map((line) =>
      line === '' ? '<div><br></div>' : `<div>${escapeHtml(line)}</div>`,
    )
    .join('');
}

/** Escaped text with line breaks as `<br>`. */
export function textToHtml(text: string): string {
  return escapeHtml(normalizeLineBreaks(text)).replaceAll('\n', '<br>');
}

export function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
