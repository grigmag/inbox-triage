import { describe, expect, it } from 'vitest';

import { allowsBillableRequests } from './openrouter-billing-guard';

describe('allowsBillableRequests', () => {
  it('allows only the exact true value', () => {
    expect(allowsBillableRequests('true')).toBe(true);

    for (const value of [undefined, '', 'false', 'TRUE', '1']) {
      expect(allowsBillableRequests(value)).toBe(false);
    }
  });
});
