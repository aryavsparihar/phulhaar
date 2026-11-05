/**
 * Checks the schema against Shopify's own rules before anyone runs it at a store.
 *
 * A rejected metafield definition is a slow thing to debug: the Admin API refuses it with a
 * terse userError halfway through a run, leaving the store half set up. Every rule here is one
 * Shopify enforces, and failing in a unit test costs a second rather than a round trip.
 */

import {describe, expect, it} from 'vitest';
import {
  allMetaobjectTypes,
  ARTIST_METAOBJECT,
  FILTER_LIMIT,
  FILTERABLE_TYPES,
  NAMESPACE,
  PRODUCT_METAFIELDS,
  TAXONOMIES,
} from './definitions.ts';

/** Shopify: lower case, digits and underscores, starting with a letter, at most 30 characters. */
const KEY = /^[a-z][a-z0-9_]{0,29}$/;

/** Shopify: lower case, digits, underscores and hyphens. */
const METAOBJECT_TYPE = /^[a-z][a-z0-9_-]*$/;

describe('the namespace', () => {
  it("is within Shopify's 20-character limit", () => {
    expect(NAMESPACE.length).toBeLessThanOrEqual(20);
    expect(NAMESPACE).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});

describe('product metafields', () => {
  it('have keys Shopify will accept', () => {
    for (const field of PRODUCT_METAFIELDS) {
      expect(field.key, `${field.key} is not a usable metafield key`).toMatch(
        KEY,
      );
    }
  });

  it('have no duplicate keys', () => {
    const keys = PRODUCT_METAFIELDS.map((field) => field.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every one is described, so the admin explains itself', () => {
    for (const field of PRODUCT_METAFIELDS) {
      expect(field.name.length, `${field.key} has no name`).toBeGreaterThan(0);
      expect(
        field.description.length,
        `${field.key} has no description`,
      ).toBeGreaterThan(10);
    }
  });

  it('only marks a field as a filter when Search & Discovery can filter on its type', () => {
    for (const field of PRODUCT_METAFIELDS.filter(
      (candidate) => candidate.filter,
    )) {
      expect(
        FILTERABLE_TYPES.has(field.type),
        `${field.key} is marked as a filter but ${field.type} cannot be filtered on`,
      ).toBe(true);
    }
  });

  it('asks for no more filters than a store is allowed', () => {
    const filters = PRODUCT_METAFIELDS.filter((field) => field.filter);
    // Shopify counts standard filters (price, availability) against the same 25, so the custom
    // ones have to leave room for them.
    expect(filters.length).toBeLessThan(FILTER_LIMIT);
  });

  it('points every metaobject reference at a definition this script creates', () => {
    const known = new Set(allMetaobjectTypes());

    for (const field of PRODUCT_METAFIELDS) {
      if (!field.type.includes('metaobject_reference')) continue;

      const target = field.validations?.find(
        (validation) => validation.name === 'metaobject_definition_type',
      );

      expect(
        target,
        `${field.key} is a metaobject reference with no target type`,
      ).toBeDefined();
      expect(
        known,
        `${field.key} points at an unknown metaobject type`,
      ).toContain(target!.value);
    }
  });

  it('records who may edit each field, so the studio can enforce it', () => {
    for (const field of PRODUCT_METAFIELDS) {
      expect(['artist', 'staff', 'computed', 'pjk']).toContain(field.editor);
    }
  });

  it('never lets an artist write a field that is derived or decided by staff', () => {
    const byKey = new Map(
      PRODUCT_METAFIELDS.map((field) => [field.key, field]),
    );

    // The ones it would be most damaging to let an artist set themselves.
    expect(byKey.get('orientation')?.editor).toBe('computed');
    expect(byKey.get('size_band')?.editor).toBe('computed');
    expect(byKey.get('availability')?.editor).toBe('staff');
    expect(byKey.get('review_status')?.editor).toBe('staff');
  });
});

describe('taxonomies', () => {
  it('have types Shopify will accept, and no duplicates', () => {
    const types = TAXONOMIES.map((taxonomy) => taxonomy.type);

    for (const type of types) expect(type).toMatch(METAOBJECT_TYPE);
    expect(new Set(types).size).toBe(types.length);
  });

  it('have unique handles within each taxonomy', () => {
    for (const taxonomy of TAXONOMIES) {
      const handles = taxonomy.entries.map((entry) => entry.handle);
      expect(
        new Set(handles).size,
        `${taxonomy.type} has a repeated handle`,
      ).toBe(handles.length);
    }
  });

  it('give every entry a handle Shopify will accept', () => {
    for (const taxonomy of TAXONOMIES) {
      for (const entry of taxonomy.entries) {
        expect(entry.handle, `${taxonomy.type}/${entry.name}`).toMatch(
          /^[a-z0-9][a-z0-9-]*$/,
        );
        expect(entry.name.length).toBeGreaterThan(0);
      }
    }
  });

  it('lists every state and union territory, since the directory is grouped by them', () => {
    const states = TAXONOMIES.find(
      (taxonomy) => taxonomy.type === 'phulhaar_state',
    );
    // 28 states and 8 union territories.
    expect(states?.entries).toHaveLength(36);
  });

  it('gives only the colour taxonomy a swatch, which is what a swatch filter needs', () => {
    const withColour = TAXONOMIES.filter((taxonomy) => taxonomy.withColour);
    expect(withColour.map((taxonomy) => taxonomy.type)).toEqual([
      'phulhaar_colour',
    ]);
  });

  it('stays well inside the 128 metaobject definitions a store may have', () => {
    expect(allMetaobjectTypes().length).toBeLessThan(128);
  });
});

describe('the artist metaobject', () => {
  it('has keys Shopify will accept, and no duplicates', () => {
    const keys = ARTIST_METAOBJECT.fields.map((field) => field.key);

    for (const key of keys) expect(key).toMatch(KEY);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('stays within the 40 fields a metaobject definition may have', () => {
    expect(ARTIST_METAOBJECT.fields.length).toBeLessThanOrEqual(40);
  });

  it('requires the Artist ID, which is the join to PJK', () => {
    const artistId = ARTIST_METAOBJECT.fields.find(
      (field) => field.key === 'artist_id',
    );

    expect(artistId?.required).toBe(true);
    expect(artistId?.validations?.[0]).toEqual({
      name: 'regex',
      value: '^(AT|PT)\\d{6,}$',
    });
  });

  it('holds nothing that belongs to KYC', () => {
    // The whole arrangement with PJK rests on this. A field named like any of these would mean
    // identity data had started leaking into the gallery.
    const forbidden = [
      'pan',
      'aadhaar',
      'aadhar',
      'bank',
      'account',
      'ifsc',
      'email',
      'phone',
      'address',
      'dob',
      'passport',
    ];
    const keys = ARTIST_METAOBJECT.fields.map((field) => field.key);

    for (const key of keys) {
      for (const word of forbidden) {
        expect(
          key.includes(word),
          `the artist metaobject must not hold ${key}`,
        ).toBe(false);
      }
    }
  });
});
