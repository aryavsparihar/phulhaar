import {describe, expect, it} from 'vitest';
import {
  activeFilters,
  saleStateOf,
  catalogueEntry,
  catalogueFacets,
  catalogueHref,
  filterCatalogue,
  NO_FILTERS,
  pageOf,
  parseCatalogueFilters,
  sortCatalogue,
  type ArtworkCardData,
} from '~/lib/catalogue';

let rank = 0;
function work(
  id: string,
  {
    h,
    w,
    price = 1000,
    available = true,
    mediums = [] as string[],
    traditions = [] as string[],
    tags = [] as string[],
    createdAt = '2026-01-01',
  }: {
    h?: number;
    w?: number;
    price?: number;
    available?: boolean;
    mediums?: string[];
    traditions?: string[];
    tags?: string[];
    createdAt?: string;
  },
) {
  const card: ArtworkCardData = {
    id,
    handle: id,
    title: id,
    availableForSale: available,
    priceRange: {
      minVariantPrice: {amount: String(price), currencyCode: 'INR'},
    },
    artist: {reference: {handle: 'someone'}},
    heightCm: h ? {value: String(h)} : null,
    widthCm: w ? {value: String(w)} : null,
    mediums: {
      references: {nodes: mediums.map((name) => ({field: {value: name}}))},
    },
  };
  return catalogueEntry(card, {traditions, tags, createdAt, rank: rank++});
}

const entries = [
  work('small-portrait', {
    h: 40,
    w: 30,
    mediums: ['Acrylic'],
    tags: ['Peacock'],
  }),
  work('medium-landscape', {
    h: 50,
    w: 80,
    price: 5000,
    mediums: ['Natural pigments'],
    traditions: ['Madhubani'],
    createdAt: '2026-03-01',
  }),
  work('large-square', {
    h: 120,
    w: 120,
    price: 300,
    available: false,
    mediums: ['Acrylic'],
    traditions: ['Gond'],
  }),
  work('oversized', {
    h: 200,
    w: 150,
    price: 90000,
    traditions: ['Madhubani'],
    createdAt: '2026-02-01',
  }),
  work('no-size', {}),
];

describe('parseCatalogueFilters', () => {
  it('reads every filter and ignores what it does not recognise', () => {
    const filters = parseCatalogueFilters(
      new URLSearchParams(
        'available=1&size=large&orientation=square&medium=Acrylic&tradition=Gond&tag=Peacock',
      ),
    );
    expect(filters).toEqual({
      tag: 'Peacock',
      available: true,
      size: 'large',
      orientation: 'square',
      medium: 'Acrylic',
      tradition: 'Gond',
      colour: '',
    });
    expect(
      parseCatalogueFilters(
        new URLSearchParams('size=enormous&orientation=round&available=yes'),
      ),
    ).toEqual(NO_FILTERS);
  });
});

describe('the size bands use the centimetre rules', () => {
  it('bands by the longest side, upper bounds exclusive', () => {
    const size = (id: string) => entries.find((e) => e.work.id === id)?.size;
    expect(size('small-portrait')).toBe('small');
    expect(size('medium-landscape')).toBe('medium');
    expect(size('large-square')).toBe('large');
    expect(size('oversized')).toBe('oversized');
    expect(size('no-size')).toBeNull();
  });
});

describe('filterCatalogue', () => {
  const ids = (query: string) =>
    filterCatalogue(
      entries,
      parseCatalogueFilters(new URLSearchParams(query)),
    ).map((e) => e.work.id);

  it('filters on each facet, and on several at once', () => {
    expect(ids('available=1')).not.toContain('large-square');
    expect(ids('size=small')).toEqual(['small-portrait']);
    expect(ids('orientation=landscape')).toEqual(['medium-landscape']);
    expect(ids('medium=acrylic')).toEqual(['small-portrait', 'large-square']);
    expect(ids('tradition=Madhubani')).toEqual([
      'medium-landscape',
      'oversized',
    ]);
    expect(ids('tradition=Madhubani&size=oversized')).toEqual(['oversized']);
    expect(ids('tag=peacock')).toEqual(['small-portrait']);
  });
});

describe('catalogueFacets', () => {
  it('counts each facet with the other filters applied', () => {
    const facets = catalogueFacets(
      entries,
      parseCatalogueFilters(new URLSearchParams('tradition=Madhubani')),
    );
    expect(facets.size.map((o) => [o.value, o.count])).toEqual([
      ['medium', 1],
      ['oversized', 1],
    ]);
    // Its own facet ignores itself, so the other traditions stay choosable.
    expect(facets.tradition.map((o) => o.value).sort()).toEqual([
      'Gond',
      'Madhubani',
    ]);
    expect(facets.available).toBe(2);
  });
});

describe('sortCatalogue', () => {
  const order = (sort: Parameters<typeof sortCatalogue>[1]) =>
    sortCatalogue(entries, sort).map((e) => e.work.id);
  it('sorts by price, by newest, and by best-selling rank', () => {
    expect(order('price-low')[0]).toBe('large-square');
    expect(order('price-high')[0]).toBe('oversized');
    expect(order('newest')[0]).toBe('medium-landscape');
    expect(order('featured')[0]).toBe('small-portrait');
  });
});

describe('pageOf', () => {
  it('pages and keeps an out-of-range page inside the list', () => {
    const list = Array.from({length: 50}, (_, i) => i);
    expect(pageOf(list, 2, 24)).toMatchObject({page: 2, pages: 3, total: 50});
    expect(pageOf(list, 2, 24).items[0]).toBe(24);
    expect(pageOf(list, 99, 24).page).toBe(3);
    expect(pageOf(list, Number.NaN, 24).page).toBe(1);
    expect(pageOf([], 1, 24)).toMatchObject({page: 1, pages: 1, total: 0});
  });
});

describe('pills and links', () => {
  const filters = parseCatalogueFilters(
    new URLSearchParams('available=1&size=small&medium=Acrylic'),
  );
  it('lists the filters in force', () => {
    expect(activeFilters(filters).map((p) => p.key)).toEqual([
      'available',
      'size',
      'medium',
    ]);
    expect(activeFilters(NO_FILTERS)).toEqual([]);
  });
  it('builds short, stable addresses', () => {
    expect(catalogueHref(filters, 'price-low', 2)).toBe(
      '/collections/all?available=1&size=small&medium=Acrylic&sort=price-low&page=2',
    );
    expect(catalogueHref(NO_FILTERS, 'featured')).toBe('/collections/all');
  });
});

describe('saleStateOf', () => {
  const v = (value: string) => ({value});
  it('reads the availability field, stock and price together', () => {
    expect(
      saleStateOf({
        availability: v('available'),
        availableForSale: true,
        price: '45000',
      }),
    ).toBe('available');
    expect(
      saleStateOf({
        availability: v('price_on_request'),
        availableForSale: true,
        price: '0',
      }),
    ).toBe('price_on_request');
    // The admin stores "price on request" as 0, so 0 alone reads the same way.
    expect(
      saleStateOf({
        availability: v('available'),
        availableForSale: true,
        price: '0',
      }),
    ).toBe('price_on_request');
    expect(
      saleStateOf({
        availability: v('reserved'),
        availableForSale: true,
        price: '100',
      }),
    ).toBe('reserved');
    expect(
      saleStateOf({
        availability: v('on_hold'),
        availableForSale: true,
        price: '100',
      }),
    ).toBe('reserved');
    expect(
      saleStateOf({
        availability: v('not_for_sale'),
        availableForSale: true,
        price: '100',
      }),
    ).toBe('not_for_sale');
    expect(
      saleStateOf({
        availability: v('sold'),
        availableForSale: true,
        price: '100',
      }),
    ).toBe('sold');
    // Out of stock is sold, whatever the field says.
    expect(
      saleStateOf({
        availability: v('available'),
        availableForSale: false,
        price: '100',
      }),
    ).toBe('sold');
  });
  it('counts only works a buyer can still have as available', () => {
    const reserved = catalogueEntry(
      {
        id: 'r',
        handle: 'r',
        title: 'r',
        availableForSale: true,
        availability: {value: 'reserved'},
        priceRange: {minVariantPrice: {amount: '100', currencyCode: 'INR'}},
      },
      {traditions: [], tags: [], createdAt: '', rank: 0},
    );
    expect(reserved.available).toBe(false);
  });
});

describe('colour filter', () => {
  const coloured = (id: string, colours: Array<[string, string | null]>) =>
    catalogueEntry(
      {
        id,
        handle: id,
        title: id,
        availableForSale: true,
        priceRange: {minVariantPrice: {amount: '100', currencyCode: 'INR'}},
      },
      {
        traditions: [],
        tags: [],
        createdAt: '',
        rank: 0,
        colours: colours.map(([name, swatch]) => ({name, swatch})),
      },
    );
  const list = [
    coloured('a', [
      ['Red', '#b8312f'],
      ['Gold', '#c49a2c'],
    ]),
    coloured('b', [['Indigo', '#33307f']]),
    coloured('c', [['Multicoloured', null]]),
  ];
  it('filters by colour and keeps the swatch for each option', () => {
    const filters = parseCatalogueFilters(new URLSearchParams('colour=red'));
    expect(filterCatalogue(list, filters).map((e) => e.work.id)).toEqual(['a']);
    const facets = catalogueFacets(list, NO_FILTERS);
    expect(facets.colour.find((o) => o.value === 'Indigo')?.swatch).toBe(
      '#33307f',
    );
    expect(
      facets.colour.find((o) => o.value === 'Multicoloured')?.swatch,
    ).toBeNull();
    expect(catalogueHref(filters, 'featured')).toBe(
      '/collections/all?colour=red',
    );
  });
  it('accepts the American spelling in the address', () => {
    expect(
      parseCatalogueFilters(new URLSearchParams('color=Blue')).colour,
    ).toBe('Blue');
  });
});
