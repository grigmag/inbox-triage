const POSTGRES_INTEGER_MAX = 2_147_483_647;
const POSTGRES_INTEGER_MAX_BIGINT = BigInt(POSTGRES_INTEGER_MAX);
const CENTS_PER_EURO = BigInt(100);

export type EuroAmountParseFailureReason = 'invalid' | 'precision' | 'range';

export type EuroAmountParseResult =
  | { success: true; value: number }
  | { success: false; reason: EuroAmountParseFailureReason };

export function parseEuroAmountToCents(value: string): EuroAmountParseResult {
  const normalizedValue = value.trim();

  if (/^\d+\.\d{3,}$/.test(normalizedValue)) {
    return { success: false, reason: 'precision' };
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalizedValue);

  if (!match) {
    return { success: false, reason: 'invalid' };
  }

  const [, euros, fraction = ''] = match;
  const cents =
    BigInt(euros) * CENTS_PER_EURO + BigInt(fraction.padEnd(2, '0'));

  if (cents > POSTGRES_INTEGER_MAX_BIGINT) {
    return { success: false, reason: 'range' };
  }

  return { success: true, value: Number(cents) };
}

export function formatCentsAsEuro(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0 || cents > POSTGRES_INTEGER_MAX) {
    throw new RangeError('Cents must be a non-negative PostgreSQL integer.');
  }

  const euros = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');

  return `${euros}.${fraction}`;
}
