import { describe, expect, it } from 'vitest';
import {
  formatCentsAsEuro,
  parseEuroAmountToCents,
} from './parse-euro-amount-to-cents';

describe('parseEuroAmountToCents', () => {
  it.each([
    ['0', 0],
    ['0.0', 0],
    ['0.00', 0],
    [' 12.3 ', 1_230],
    ['12.34', 1_234],
    ['00012.04', 1_204],
    ['21474836.47', 2_147_483_647],
  ])('converts %j to %i cents', (input, expected) => {
    expect(parseEuroAmountToCents(input)).toEqual({
      success: true,
      value: expected,
    });
  });

  it.each(['1.001', '1.2345'])('rejects excess precision in %j', (input) => {
    expect(parseEuroAmountToCents(input)).toEqual({
      success: false,
      reason: 'precision',
    });
  });

  it.each(['', ' ', '-1', '+1', '1.', '.5', '1e2', '1,00', '1 000', 'NaN'])(
    'rejects invalid amount %j',
    (input) => {
      expect(parseEuroAmountToCents(input)).toEqual({
        success: false,
        reason: 'invalid',
      });
    },
  );

  it.each(['21474836.48', '999999999999999999999999999999.99'])(
    'rejects out-of-range amount %j',
    (input) => {
      expect(parseEuroAmountToCents(input)).toEqual({
        success: false,
        reason: 'range',
      });
    },
  );
});

describe('formatCentsAsEuro', () => {
  it.each([
    [0, '0.00'],
    [1, '0.01'],
    [120, '1.20'],
    [2_147_483_647, '21474836.47'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatCentsAsEuro(cents)).toBe(expected);
  });

  it.each([-1, 1.5, Number.NaN, 2_147_483_648])(
    'rejects invalid stored cents %j',
    (cents) => {
      expect(() => formatCentsAsEuro(cents)).toThrow(RangeError);
    },
  );
});
