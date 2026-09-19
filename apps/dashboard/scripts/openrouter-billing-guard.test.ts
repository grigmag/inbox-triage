import { describe, expect, it } from 'vitest';

import { allowsBillableSmokeTest } from './openrouter-billing-guard';

describe('allowsBillableSmokeTest', () => {
  it('allows only the exact true value', () => {
    expect(allowsBillableSmokeTest('true')).toBe(true);

    for (const value of [undefined, '', 'false', 'TRUE', '1']) {
      expect(allowsBillableSmokeTest(value)).toBe(false);
    }
  });
});
