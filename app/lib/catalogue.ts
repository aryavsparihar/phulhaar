/**
 * The artwork fields every listing needs, and the code that reads them.
 *
 * Artworks are Shopify products with metafields under the `phulhaar` namespace (created by
 * `pnpm shopify:setup`; see docs/DATA-MODEL.md). Against mock.shop, or for a product staff have
 * not finished, those metafields are empty, so every reader here falls back to Shopify's own
 * fields (vendor for the artist, product type for the category) rather than showing a gap.
 */
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {
  formatDimensions,
  orientationOf,
  sizeBandOf,
  type Orientation,
  type SizeBand,
} from '~/lib/artwork';

export const ARTWORK_CARD_FRAGMENT = `#graphql
  fragment ArtworkCard on Product {
    id
    handle
    title
    vendor
    productType
    availableForSale
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    artist: metafield(namespace: "phulhaar", key: "artist") {
      reference {
        ... on Metaobject {
          handle
          displayName: field(key: "display_name") { value }
          artistId: field(key: "artist_id") { value }
        }
      }
    }
    year: metafield(namespace: "phulhaar", key: "year") { value }
    heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }
    widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }
    depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }
    mediums: metafield(namespace: "phulhaar", key: "mediums") {
      references(first: 3) {
        nodes {
          ... on Metaobject { field(key: "name") { value } }
        }
      }
    }
  }
` as const;

type Field = {value?: string | null} | null | undefined;
type NamedNodes =
  | {
      references?: {
        nodes: Array<{field?: Field} | Record<string, never>>;
      } | null;
    }
  | null
  | undefined;

export interface ArtworkCardData {
  id: string;
  handle: string;
  title: string;
  vendor?: string | null;
  productType?: string | null;
  availableForSale?: boolean | null;
  featuredImage?: {
    id?: string | null;
    altText?: string | null;
    url: string;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {minVariantPrice: MoneyV2};
  artist?: {
    reference?:
      | {handle?: string; displayName?: Field; artistId?: Field}
      | Record<string, never>
      | null;
  } | null;
  year?: Field;
  heightCm?: Field;
  widthCm?: Field;
  depthCm?: Field;
  mediums?: NamedNodes;
}

export function namesOf(field: NamedNodes): string[] {
  return (field?.references?.nodes ?? [])
    .map((node) => ('field' in node ? node.field?.value : null))
    .filter((name): name is string => !!name);
}

export function numberOf(field: Field): number | undefined {
  const value = field?.value ? Number(field.value) : NaN;
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Whether a product is an artwork: every live artwork names its artist (the field is required in
 * the admin). Anything else in the store, such as mock.shop's sample clothes before the real store
 * is connected, is not shown.
 */
export function isArtwork(product: Pick<ArtworkCardData, 'artist'>) {
  return !!product.artist?.reference;
}

export function artistOf(product: Pick<ArtworkCardData, 'artist' | 'vendor'>) {
  const reference = product.artist?.reference;
  const name =
    (reference && 'displayName' in reference
      ? reference.displayName?.value
      : null) ??
    product.vendor ??
    null;
  const handle =
    reference && 'handle' in reference ? (reference.handle ?? null) : null;
  const artistId =
    reference && 'artistId' in reference
      ? (reference.artistId?.value ?? null)
      : null;
  return {name, handle, artistId};
}

export function dimensionsOf(
  product: Pick<ArtworkCardData, 'heightCm' | 'widthCm' | 'depthCm'>,
) {
  const heightCm = numberOf(product.heightCm);
  const widthCm = numberOf(product.widthCm);
  if (!heightCm || !widthCm) return null;
  return formatDimensions({
    heightCm,
    widthCm,
    depthCm: numberOf(product.depthCm),
  });
}

/** "Acrylic on canvas, 2024" or whatever part of it is known. */
export function captionOf(product: ArtworkCardData) {
  const medium = namesOf(product.mediums).join(', ') || product.productType;
  return [medium, product.year?.value].filter(Boolean).join(', ');
}

/** Storefront API sort keys, by the name the visitor chooses. */
export const SORTS = {
  featured: {label: 'Featured', sortKey: 'BEST_SELLING', reverse: false},
  newest: {label: 'Newest', sortKey: 'CREATED_AT', reverse: true},
  'price-low': {label: 'Price, low to high', sortKey: 'PRICE', reverse: false},
  'price-high': {label: 'Price, high to low', sortKey: 'PRICE', reverse: true},
} as const;

export type SortName = keyof typeof SORTS;

export function sortFrom(url: URL): SortName {
  const sort = url.searchParams.get('sort');
  return sort && sort in SORTS ? (sort as SortName) : 'featured';
}

/**
 * Whether a work belongs to this artist. The Artist ID on the work's artist profile decides when
 * it is there; otherwise the name has to match exactly. Shopify's product search treats
 * `vendor:` as a hint rather than a filter, so a listing must never trust it alone.
 */
export function belongsTo(
  work: Pick<ArtworkCardData, 'artist' | 'vendor'>,
  artist: {artistId?: string | null; name?: string | null},
) {
  const owner = artistOf(work);
  if (owner.artistId && artist.artistId)
    return owner.artistId === artist.artistId;
  const a = owner.name?.trim().toLowerCase();
  const b = artist.name?.trim().toLowerCase();
  return !!a && !!b && a === b;
}

/* ------------------------------------------------------------------------------------------------
 * Faceted filtering for /collections/all.
 *
 * The Storefront API's product search cannot filter on metafields or on a size computed from the
 * dimensions, so the gallery filters its own catalogue: every live work is read once (and cached,
 * see search-index.server.ts), then filtered, counted, sorted and paged here, exactly.
 * --------------------------------------------------------------------------------------------- */

export const SIZE_LABELS: Record<SizeBand, string> = {
  small: 'Small, under 45 cm',
  medium: 'Medium, 45–90 cm',
  large: 'Large, 90–150 cm',
  oversized: 'Oversized, 150 cm and over',
};
export const ORIENTATION_LABELS: Record<Orientation, string> = {
  portrait: 'Portrait',
  landscape: 'Landscape',
  square: 'Square',
};

/** One work with everything a filter or a sort needs, worked out once. */
export interface CatalogueEntry {
  work: ArtworkCardData;
  available: boolean;
  size: SizeBand | null;
  orientation: Orientation | null;
  mediums: string[];
  traditions: string[];
  tags: string[];
  price: number;
  createdAt: string;
  /** Position in Shopify's best-selling order, for "Featured". */
  rank: number;
}

export function catalogueEntry(
  work: ArtworkCardData,
  extra: {
    traditions: string[];
    tags: string[];
    createdAt: string;
    rank: number;
  },
): CatalogueEntry {
  const heightCm = numberOf(work.heightCm);
  const widthCm = numberOf(work.widthCm);
  const dims =
    heightCm && widthCm && heightCm > 0 && widthCm > 0
      ? {heightCm, widthCm, depthCm: numberOf(work.depthCm)}
      : null;
  return {
    work,
    available: !!work.availableForSale,
    size: dims ? sizeBandOf(dims) : null,
    orientation: dims ? orientationOf(dims) : null,
    mediums: namesOf(work.mediums),
    traditions: extra.traditions,
    tags: extra.tags,
    price: Number(work.priceRange.minVariantPrice.amount) || 0,
    createdAt: extra.createdAt,
    rank: extra.rank,
  };
}

export interface CatalogueFilters {
  tag: string;
  available: boolean;
  size: SizeBand | null;
  orientation: Orientation | null;
  medium: string;
  tradition: string;
}

const text = (value: string | null) => value?.trim().slice(0, 60) ?? '';

/** Filters from the address bar. Anything not recognised is ignored, never an error. */
export function parseCatalogueFilters(
  params: URLSearchParams,
): CatalogueFilters {
  const size = params.get('size');
  const orientation = params.get('orientation');
  return {
    tag: text(params.get('tag')),
    available: params.get('available') === '1',
    size: size && size in SIZE_LABELS ? (size as SizeBand) : null,
    orientation:
      orientation && orientation in ORIENTATION_LABELS
        ? (orientation as Orientation)
        : null,
    medium: text(params.get('medium')),
    tradition: text(params.get('tradition')),
  };
}

const same = (a: string, b: string) =>
  a.localeCompare(b, 'en-IN', {sensitivity: 'base'}) === 0;
const includes = (list: string[], value: string) =>
  list.some((item) => same(item, value));

type FacetKey = Exclude<keyof CatalogueFilters, never>;

/** Whether an entry passes every filter, optionally ignoring one (for that facet's counts). */
function passes(
  entry: CatalogueEntry,
  filters: CatalogueFilters,
  ignore?: FacetKey,
) {
  if (ignore !== 'tag' && filters.tag && !includes(entry.tags, filters.tag))
    return false;
  if (ignore !== 'available' && filters.available && !entry.available)
    return false;
  if (ignore !== 'size' && filters.size && entry.size !== filters.size)
    return false;
  if (
    ignore !== 'orientation' &&
    filters.orientation &&
    entry.orientation !== filters.orientation
  )
    return false;
  if (
    ignore !== 'medium' &&
    filters.medium &&
    !includes(entry.mediums, filters.medium)
  )
    return false;
  if (
    ignore !== 'tradition' &&
    filters.tradition &&
    !includes(entry.traditions, filters.tradition)
  )
    return false;
  return true;
}

export function filterCatalogue(
  entries: CatalogueEntry[],
  filters: CatalogueFilters,
) {
  return entries.filter((entry) => passes(entry, filters));
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

function tally(values: string[][]): FacetOption[] {
  const counts = new Map<string, FacetOption>();
  for (const list of values) {
    for (const value of new Set(list.map((v) => v.trim()).filter(Boolean))) {
      const key = value.toLowerCase();
      const entry = counts.get(key) ?? {value, label: value, count: 0};
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'en-IN'),
  );
}

/**
 * Options for each facet with how many works each would show, counted with every *other* filter
 * applied: choosing "Large" still shows how many portraits there are among the large works.
 */
export function catalogueFacets(
  entries: CatalogueEntry[],
  filters: CatalogueFilters,
) {
  const without = (key: FacetKey) =>
    entries.filter((entry) => passes(entry, filters, key));
  const ordered = <T extends string>(
    labels: Record<T, string>,
    list: CatalogueEntry[],
    pick: (entry: CatalogueEntry) => T | null,
  ): FacetOption[] =>
    (Object.keys(labels) as T[])
      .map((value) => ({
        value,
        label: labels[value],
        count: list.filter((entry) => pick(entry) === value).length,
      }))
      .filter((option) => option.count > 0);
  return {
    available: without('available').filter((entry) => entry.available).length,
    size: ordered(SIZE_LABELS, without('size'), (entry) => entry.size),
    orientation: ordered(
      ORIENTATION_LABELS,
      without('orientation'),
      (entry) => entry.orientation,
    ),
    medium: tally(without('medium').map((entry) => entry.mediums)),
    tradition: tally(without('tradition').map((entry) => entry.traditions)),
  };
}

export function sortCatalogue(entries: CatalogueEntry[], sort: SortName) {
  const list = [...entries];
  if (sort === 'newest')
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else if (sort === 'price-low') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-high') list.sort((a, b) => b.price - a.price);
  else list.sort((a, b) => a.rank - b.rank);
  return list;
}

export function pageOf<T>(list: T[], requested: number, perPage: number) {
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const page = Math.min(Math.max(1, Math.floor(requested) || 1), pages);
  return {
    items: list.slice((page - 1) * perPage, page * perPage),
    page,
    pages,
    total: list.length,
  };
}

/** The filters in force, as pills that each know how to remove themselves. */
export function activeFilters(filters: CatalogueFilters) {
  const pills: Array<{key: keyof CatalogueFilters; label: string}> = [];
  if (filters.tag) pills.push({key: 'tag', label: filters.tag});
  if (filters.available) pills.push({key: 'available', label: 'Available'});
  if (filters.size) pills.push({key: 'size', label: SIZE_LABELS[filters.size]});
  if (filters.orientation)
    pills.push({
      key: 'orientation',
      label: ORIENTATION_LABELS[filters.orientation],
    });
  if (filters.medium) pills.push({key: 'medium', label: filters.medium});
  if (filters.tradition)
    pills.push({key: 'tradition', label: filters.tradition});
  return pills;
}

/** The /collections/all address for these filters, sort and page; defaults are left out. */
export function catalogueHref(
  filters: CatalogueFilters,
  sort: SortName,
  page = 1,
) {
  const params = new URLSearchParams();
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.available) params.set('available', '1');
  if (filters.size) params.set('size', filters.size);
  if (filters.orientation) params.set('orientation', filters.orientation);
  if (filters.medium) params.set('medium', filters.medium);
  if (filters.tradition) params.set('tradition', filters.tradition);
  if (sort !== 'featured') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/collections/all${query ? `?${query}` : ''}`;
}

export const NO_FILTERS: CatalogueFilters = {
  tag: '',
  available: false,
  size: null,
  orientation: null,
  medium: '',
  tradition: '',
};
