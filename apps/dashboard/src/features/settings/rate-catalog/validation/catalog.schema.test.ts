import { describe, expect, it } from 'vitest';
import { rateCatalogSchema } from './catalog.schema';

describe('rateCatalogSchema', () => {
  it.each(['crew', 'deliverable', 'addon'])(
    'accepts the %s catalog',
    (catalog) => {
      expect(rateCatalogSchema.parse(catalog)).toBe(catalog);
    },
  );
});
