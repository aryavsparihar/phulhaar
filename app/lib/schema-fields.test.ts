import {describe, expect, it} from 'vitest';
import {
  ARTIST_METAOBJECT,
  GALLERY_METAOBJECT,
  PRODUCT_METAFIELDS,
} from '../../scripts/shopify/definitions';
import {
  errorDetail,
  isEditable,
  parseFields,
  PATTERNS,
  staffFields,
  type FieldDef,
} from './schema-fields';

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

describe('the admin artwork form', () => {
  const fields = staffFields(PRODUCT_METAFIELDS as FieldDef[]);
  const artist = fields.find((field) => field.key === 'artist')!;

  it('lets staff choose the artist, and only in the admin', () => {
    expect(isEditable(artist)).toBe(true);
    expect(
      isEditable(
        (PRODUCT_METAFIELDS as FieldDef[]).find((f) => f.key === 'artist')!,
      ),
    ).toBe(false);
  });

  it('requires an artist, and keeps the one chosen', () => {
    const empty = parseFields(new FormData(), fields);
    expect(empty.errors.artist).toBe('Artist is required');

    const form = new FormData();
    form.set('f.artist', 'gid://shopify/Metaobject/42');
    expect(parseFields(form, fields).values.artist).toBe(
      'gid://shopify/Metaobject/42',
    );
  });

  it('names every field that needs attention', () => {
    expect(
      errorDetail(
        {
          artist: 'Artist is required',
          price: 'Digits only',
          images: 'A live work needs at least one photograph',
        },
        fields,
        {price: 'Price', images: 'Photographs'},
      ),
    ).toEqual([
      'Artist is required',
      'Price: Digits only',
      'Photographs: A live work needs at least one photograph',
    ]);
  });
});
