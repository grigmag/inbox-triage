import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fieldErrorsFromZod } from './field-errors-from-zod';

describe('fieldErrorsFromZod', () => {
  it('keeps the first message per top-level field, including nested paths', () => {
    const error = new z.ZodError([
      { code: 'custom', path: ['name'], message: 'Name is required.' },
      { code: 'custom', path: ['name'], message: 'Name is too short.' },
      { code: 'custom', path: ['orderedIds', 0], message: 'Invalid ID.' },
    ]);

    expect(fieldErrorsFromZod(error)).toEqual({
      name: 'Name is required.',
      orderedIds: 'Invalid ID.',
    });
  });

  it('filters fields when an allowlist is supplied', () => {
    const error = new z.ZodError([
      { code: 'custom', path: ['name'], message: 'Name is required.' },
      { code: 'custom', path: ['unknown'], message: 'Unknown field.' },
    ]);

    expect(fieldErrorsFromZod(error, ['name'])).toEqual({
      name: 'Name is required.',
    });
    expect(fieldErrorsFromZod(error, [])).toEqual({});
  });

  it('ignores root errors and paths without a string field name', () => {
    const error = new z.ZodError([
      { code: 'custom', path: [], message: 'Invalid form.' },
      { code: 'custom', path: [0], message: 'Invalid item.' },
      { code: 'custom', path: [Symbol('field')], message: 'Invalid field.' },
    ]);

    expect(fieldErrorsFromZod(error)).toEqual({});
    expect(fieldErrorsFromZod(new z.ZodError([]))).toEqual({});
  });
});
