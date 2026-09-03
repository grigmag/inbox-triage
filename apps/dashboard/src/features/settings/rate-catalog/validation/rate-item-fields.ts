import { z } from 'zod';
import {
  parseEuroAmountToCents,
  type EuroAmountParseFailureReason,
} from './parse-euro-amount-to-cents';
import { RATE_CATALOG_VALIDATION_MESSAGES } from './validation-messages';

export const CATALOG_NAME_MAX_LENGTH = 120;
export const PERCENTAGE_MAX = 100;

const EURO_CENTS_ERROR_MESSAGES = {
  invalid: RATE_CATALOG_VALIDATION_MESSAGES.catalog.money,
  precision: RATE_CATALOG_VALIDATION_MESSAGES.catalog.moneyPrecision,
  range: RATE_CATALOG_VALIDATION_MESSAGES.catalog.numericRange,
} as const satisfies Record<EuroAmountParseFailureReason, string>;

export const catalogNameSchema = z
  .string()
  .trim()
  .min(1, RATE_CATALOG_VALIDATION_MESSAGES.catalog.nameRequired)
  .max(
    CATALOG_NAME_MAX_LENGTH,
    RATE_CATALOG_VALIDATION_MESSAGES.catalog.nameTooLong,
  );

export const euroCentsSchema = z.string().transform((value, context) => {
  const result = parseEuroAmountToCents(value);

  if (result.success) {
    return result.value;
  }

  context.addIssue({
    code: 'custom',
    message: EURO_CENTS_ERROR_MESSAGES[result.reason],
  });
  return z.NEVER;
});

export const percentageSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, RATE_CATALOG_VALIDATION_MESSAGES.catalog.percentage)
  .transform(Number)
  .pipe(
    z
      .number({ error: RATE_CATALOG_VALIDATION_MESSAGES.catalog.numericRange })
      .max(
        PERCENTAGE_MAX,
        RATE_CATALOG_VALIDATION_MESSAGES.catalog.numericRange,
      ),
  );

export const activeSchema = z.boolean().default(true);
