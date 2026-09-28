export type SplitQuotedEmailText = {
  /** The new content above the quoted history, without trailing blank lines. */
  body: string;
  /** The quoted history from its first line on, or null when none is found. */
  quoted: string | null;
};

/**
 * A matcher reports whether quoted history starts at `lines[index]`. Matchers
 * are checked in order at each line, and the earliest line any of them
 * accepts becomes the boundary.
 */
type QuoteBoundaryMatcher = (lines: string[], index: number) => boolean;

// Lines such as "> Hi," or a bare ">", which most clients prefix to the
// original when they quote it.
const QUOTED_LINE = /^\s*>/;
const BLANK_LINE = /^\s*$/;

// "On <date>, <name> <email> wrote:" in English (Gmail, Apple Mail,
// Thunderbird) and the localized forms of the same attribution. Each needs a
// digit, since the attribution always carries a date.
const ATTRIBUTION_LINES = [
  /^On\s.*\d.*\swrote:$/,
  // Greek Gmail: "Στις Παρ 25 Σεπ 2026 στις 11:21 μ.μ., ο/η ... έγραψε:".
  /^Στις\s.*\d.*\sέγραψε:$/,
  // German: "Am Fr., 25. Sept. 2026 um 23:21 Uhr schrieb ... <...>:".
  /^Am\s.*\d.*\sschrieb\s.*:$/,
  // French: "Le ven. 25 sept. 2026 à 23:21, ... <...> a écrit :".
  /^Le\s.*\d.*\sa\s+écrit\s*:$/,
  // Spanish: "El vie, 25 sept 2026 a las 23:21, ... (<...>) escribió:".
  /^El\s.*\d.*\sescribió:$/,
];

// Zoho Mail's short reply header: "---- On <date> <name> <email> wrote ----".
const ZOHO_ATTRIBUTION_LINE = /^-{2,}\s*On\s.*\d.*\swrote\s*-{2,}$/;

// Lines that Zoho and Outlook put above a quoted header block, such as
// "============ Forwarded message ============", "---- Original message ----",
// "-----Original Message-----", or a line of underscores.
const HEADER_SEPARATOR_LINES = [
  /^[=-]{2,}\s*(?:Forwarded|Original)\s+message\s*[=-]{2,}$/i,
  /^_{10,}$/,
];

// Field names in the header block that Zoho (including this app's own
// replies) and Outlook write above an unprefixed original, in English and
// Greek. Outlook plain text may wrap a field name in asterisks.
const FROM_FIELD = /^\*?(?:From|Από)\*?:\s*\S/;
const OTHER_HEADER_FIELD =
  /^\*?(To|Προς|Cc|Κοιν\.?|Date|Sent|Ημερομηνία|Εστάλη|Subject|Θέμα)\*?:/;
// Date, Sent, or Subject must be present, so a "From:" line followed by only
// a "To:" line in ordinary text does not count as a header block.
const DISTINCTIVE_HEADER_FIELDS = new Set([
  'Date',
  'Sent',
  'Ημερομηνία',
  'Εστάλη',
  'Subject',
  'Θέμα',
]);
// Header lines beyond From that are scanned, which leaves room for
// continuation lines of long wrapped address lists.
const HEADER_BLOCK_SCAN_LINES = 8;

const QUOTE_BOUNDARY_MATCHERS: QuoteBoundaryMatcher[] = [
  // Gmail, Apple Mail, Thunderbird, and their localized forms. The
  // attribution may wrap onto a second line. Everything after it must be
  // `>`-quoted, so inline replies below an attribution stay visible.
  (lines, index) => {
    for (const span of [1, 2]) {
      const attribution = lines
        .slice(index, index + span)
        .map((line) => line.trim())
        .join(' ');

      if (
        index + span <= lines.length &&
        ATTRIBUTION_LINES.some((pattern) => pattern.test(attribution))
      ) {
        return isOnlyQuotedLines(lines, index + span);
      }
    }

    return false;
  },

  // Zoho Mail's short header, which is followed by the unprefixed original.
  (lines, index) => ZOHO_ATTRIBUTION_LINE.test(lines[index].trim()),

  // A Zoho or Outlook separator directly above a header block.
  (lines, index) =>
    HEADER_SEPARATOR_LINES.some((pattern) =>
      pattern.test(lines[index].trim()),
    ) && isHeaderBlock(lines, nextNonBlankLine(lines, index + 1)),

  // A Zoho or Outlook header block without a separator, including the one
  // this app's own replies quote the original under.
  isHeaderBlock,

  // A trailing run of `>`-quoted lines without an attribution.
  (lines, index) =>
    QUOTED_LINE.test(lines[index]) && isOnlyQuotedLines(lines, index),
];

/**
 * Splits plain email text into the new content and the quoted history of
 * earlier messages below it, for display. Line endings are normalized to
 * `\n` in both parts.
 *
 * Detection is conservative: a boundary counts only when the lines after it
 * are all quoted history, so inline replies and stray `>` lines stay in the
 * body. When the text is only quoted history, nothing is split off and the
 * whole text is returned as the body with `quoted: null`, so the reader never
 * sees an empty message.
 */
export function splitQuotedEmailText(text: string): SplitQuotedEmailText {
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  for (let index = 0; index < lines.length; index++) {
    if (!QUOTE_BOUNDARY_MATCHERS.some((matches) => matches(lines, index))) {
      continue;
    }

    const body = trimTrailingBlankLines(lines.slice(0, index).join('\n'));

    if (BLANK_LINE.test(body)) {
      break;
    }

    return {
      body,
      quoted: trimTrailingBlankLines(lines.slice(index).join('\n')),
    };
  }

  return { body: trimTrailingBlankLines(normalized), quoted: null };
}

// True when the lines from `start` on are `>`-quoted or blank, with at least
// one quoted line.
function isOnlyQuotedLines(lines: string[], start: number): boolean {
  const rest = lines.slice(start);

  return (
    rest.some((line) => QUOTED_LINE.test(line)) &&
    rest.every((line) => QUOTED_LINE.test(line) || BLANK_LINE.test(line))
  );
}

// True when `lines[index]` starts a "From:" header block that has a Date,
// Sent, or Subject field before the next blank line.
function isHeaderBlock(lines: string[], index: number): boolean {
  if (index >= lines.length || !FROM_FIELD.test(lines[index].trim())) {
    return false;
  }

  const fields = new Set<string>();

  for (
    let next = index + 1;
    next < lines.length && next <= index + HEADER_BLOCK_SCAN_LINES;
    next++
  ) {
    const line = lines[next].trim();

    if (line === '') {
      break;
    }

    const field = OTHER_HEADER_FIELD.exec(line)?.[1];

    if (field) {
      fields.add(field);
    }
  }

  return [...fields].some((field) => DISTINCTIVE_HEADER_FIELDS.has(field));
}

function nextNonBlankLine(lines: string[], start: number): number {
  let index = start;

  while (index < lines.length && BLANK_LINE.test(lines[index])) {
    index++;
  }

  return index;
}

function trimTrailingBlankLines(text: string): string {
  return text.replace(/(?:\n[ \t]*)+$/, '').replace(/^[ \t]*$/, '');
}
