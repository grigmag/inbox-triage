const ATEXT = String.raw`[A-Za-z0-9!#$%&'*+\-/=?^_\x60{|}~]`;
const DOT_ATOM = `${ATEXT}+(?:\\.${ATEXT}+)*`;
const QUOTED_STRING = String.raw`"(?:[\x21\x23-\x5b\x5d-\x7e]|\\[\x20-\x7e])*"`;
const DOMAIN_LITERAL = String.raw`\[(?:[\x21-\x5a\x5e-\x7e]|\\[\x20-\x7e])*\]`;
const MESSAGE_ID_PATTERN = new RegExp(
  `^<(?:${DOT_ATOM}|${QUOTED_STRING})@(?:${DOT_ATOM}|${DOMAIN_LITERAL})>$`,
);

export function parseSingleMessageIdentifier(
  value: string | undefined,
): string | null {
  const identifiers = parseMessageIdentifiers(value);
  return identifiers.length === 1 ? identifiers[0] : null;
}

export function parseMessageIdentifiers(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const identifiers: string[] = [];
  let index = 0;

  while (index < value.length) {
    const character = value[index];

    if (character === '(') {
      index = skipComment(value, index);
      continue;
    }
    if (character === '"') {
      index = skipQuotedText(value, index);
      continue;
    }
    if (character !== '<') {
      index += 1;
      continue;
    }

    const token = readAngleToken(value, index);
    if (!token) {
      break;
    }
    if (isMessageIdentifier(token.value)) {
      identifiers.push(token.value);
    }
    index = token.end + 1;
  }

  return identifiers;
}

function skipComment(value: string, start: number): number {
  let depth = 1;

  for (let index = start + 1; index < value.length; index += 1) {
    const character = value[index];
    if (character === '\\') {
      index += 1;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return value.length;
}

function skipQuotedText(value: string, start: number): number {
  for (let index = start + 1; index < value.length; index += 1) {
    if (value[index] === '\\') {
      index += 1;
    } else if (value[index] === '"') {
      return index + 1;
    }
  }

  return value.length;
}

function readAngleToken(
  value: string,
  start: number,
): { value: string; end: number } | null {
  let inDomainLiteral = false;
  let inQuotedString = false;

  for (let index = start + 1; index < value.length; index += 1) {
    const character = value[index];
    if ((inDomainLiteral || inQuotedString) && character === '\\') {
      index += 1;
    } else if (!inDomainLiteral && character === '"') {
      inQuotedString = !inQuotedString;
    } else if (!inQuotedString && character === '[') {
      inDomainLiteral = true;
    } else if (inDomainLiteral && character === ']') {
      inDomainLiteral = false;
    } else if (!inDomainLiteral && !inQuotedString && character === '>') {
      return { value: value.slice(start, index + 1), end: index };
    }
  }

  return null;
}

function isMessageIdentifier(value: string): boolean {
  return MESSAGE_ID_PATTERN.test(value);
}
