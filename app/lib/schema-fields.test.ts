import {describe, expect, it} from 'vitest';
import {
  ARTIST_METAOBJECT,
  GALLERY_METAOBJECT,
  PRODUCT_METAFIELDS,
} from '../../scripts/shopify/definitions';
import {PATTERNS} from './schema-fields';

describe('PATTERNS', () => {
  it('has a written-out regex for every regex validation in the definitions', () => {
    const fields = [
      ...PRODUCT_METAFIELDS,
      ...ARTIST_METAOBJECT.fields,
      ...GALLERY_METAOBJECT.fields,
    ] as Array<{validations?: Array<{name: string; value: string}>}>;
    const patterns = fields.flatMap(
      (field) =>
        field.validations
          ?.filter((v) => v.name === 'regex')
          .map((v) => v.value) ?? [],
    );
    expect(patterns.length).toBeGreaterThan(0);
    for (const pattern of patterns) {
      expect(PATTERNS[pattern]?.source).toBe(pattern);
    }
  });
});
