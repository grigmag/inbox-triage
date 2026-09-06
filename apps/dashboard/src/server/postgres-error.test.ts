import { describe, expect, it } from 'vitest';
import { getPostgresErrorWithCode } from './postgres-error';

describe('getPostgresErrorWithCode', () => {
  it('returns a direct PostgreSQL error with the requested code', () => {
    const error = { code: '23505', constraint_name: 'example_unique' };

    expect(getPostgresErrorWithCode(error, '23505')).toBe(error);
  });

  it('finds a PostgreSQL error wrapped as a cause', () => {
    const postgresError = {
      code: '23505',
      constraint_name: 'example_unique',
    };
    const drizzleError = new Error('Failed query', { cause: postgresError });

    expect(getPostgresErrorWithCode(drizzleError, '23505')).toBe(postgresError);
  });

  it('ignores errors with a different PostgreSQL code', () => {
    const error = new Error('Failed query', { cause: { code: '23503' } });

    expect(getPostgresErrorWithCode(error, '23505')).toBeUndefined();
  });

  it('stops when an error cause chain contains a cycle', () => {
    const error: { cause?: unknown } = {};
    error.cause = error;

    expect(getPostgresErrorWithCode(error, '23505')).toBeUndefined();
  });
});
