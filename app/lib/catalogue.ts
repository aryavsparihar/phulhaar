/**
 * The artwork fields every listing needs, and the code that reads them.
 *
 * Artworks are Shopify products with metafields under the `phulhaar` namespace (created by
 * `pnpm shopify:setup`; see docs/DATA-MODEL.md). Against mock.shop, or for a product staff have
 * not finished, those metafields are empty, so every reader here falls back to Shopify's own
 * fields (vendor for the artist, product type for the category) rather than showing a gap.
 */
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {formatDimensions} from '~/lib/artwork';

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
