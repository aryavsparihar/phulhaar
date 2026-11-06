/**
 * Feeds the search engine: every live work and every artist, read from the Storefront API and
 * turned into search documents. The pages Shopify returns are cached by Hydrogen, and the built
 * index is kept for a few minutes in the worker, so a search costs a lookup, not a crawl.
 */
import type {Storefront} from '@shopify/hydrogen';
import type {SearchCorpusQuery} from 'storefrontapi.generated';
import {
  isArtwork,
  ARTWORK_CARD_FRAGMENT,
  artistOf,
  type ArtworkCardData,
} from '~/lib/catalogue';
import {
  buildIndex,
  search,
  type SearchDoc,
  type SearchIndex,
} from '~/lib/search-engine';

const SEARCH_PRODUCTS_QUERY = `#graphql
  query SearchCorpus($country: CountryCode, $language: LanguageCode, $after: String)
  @inContext(country: $country, language: $language) {
    products(first: 250, after: $after) {
      nodes {
        ...ArtworkCard
        description
        tags
        traditions: metafield(namespace: "phulhaar", key: "traditions") { references(first: 10) { nodes { ... on Metaobject { field(key: "name") { value } } } } }
        styles: metafield(namespace: "phulhaar", key: "styles") { references(first: 10) { nodes { ... on Metaobject { field(key: "name") { value } } } } }
        subjects: metafield(namespace: "phulhaar", key: "subjects") { references(first: 10) { nodes { ... on Metaobject { field(key: "name") { value } } } } }
        colours: metafield(namespace: "phulhaar", key: "colours") { references(first: 10) { nodes { ... on Metaobject { field(key: "name") { value } } } } }
        surface: metafield(namespace: "phulhaar", key: "surface") { reference { ... on Metaobject { field(key: "name") { value } } } }
        category: metafield(namespace: "phulhaar", key: "category") { reference { ... on Metaobject { field(key: "name") { value } } } }
        note: metafield(namespace: "phulhaar", key: "artist_note") { value }
        city: metafield(namespace: "phulhaar", key: "ships_from_city") { value }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
  ${ARTWORK_CARD_FRAGMENT}
` as const;

const SEARCH_ARTISTS_QUERY = `#graphql
  query SearchArtists($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    metaobjects(type: "phulhaar_artist", first: 250) {
      nodes {
        handle
        displayName: field(key: "display_name") { value }
        city: field(key: "city") { value }
        biography: field(key: "biography") { value }
        statement: field(key: "statement") { value }
        state: field(key: "state") { reference { ... on Metaobject { field(key: "name") { value } } } }
      }
    }
  }
` as const;

export interface ArtistResult {
  handle: string;
  name: string;
  place: string;
}

interface Corpus {
  index: SearchIndex;
  works: Map<string, ArtworkCardData>;
  artists: Map<string, ArtistResult>;
  builtAt: number;
}

type Named = {
  references?: {nodes: Array<{field?: {value?: string | null} | null}>} | null;
} | null;
type One = {reference?: {field?: {value?: string | null} | null} | null} | null;
const names = (field: Named | undefined) =>
  (field?.references?.nodes ?? [])
    .map((node) => node.field?.value)
    .filter(Boolean)
    .join(', ');
const one = (field: One | undefined) => field?.reference?.field?.value ?? '';

const TTL_MS = 5 * 60 * 1000;
const MAX_PAGES = 20; // 5,000 works; plenty for a gallery, and a ceiling on the crawl.
let cached: Corpus | null = null;

async function buildCorpus(storefront: Storefront): Promise<Corpus> {
  const docs: SearchDoc[] = [];
  const works = new Map<string, ArtworkCardData>();
  let after: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const {products}: SearchCorpusQuery = await storefront.query(
      SEARCH_PRODUCTS_QUERY,
      {
        variables: {after},
        cache: storefront.CacheShort(),
      },
    );
    for (const node of products.nodes) {
      const card = node as unknown as ArtworkCardData;
      if (!isArtwork(card)) continue;
      works.set(node.id, card);
      const mediums = (node.mediums?.references?.nodes ?? [])
        .map((n: {field?: {value?: string | null} | null}) => n.field?.value)
        .filter(Boolean)
        .join(', ');
      docs.push({
        id: node.id,
        kind: 'artwork',
        fields: {
          title: node.title,
          artist: artistOf(card).name ?? '',
          tags: node.tags.join(', '),
          facets: [
            mediums,
            names(node.traditions),
            names(node.styles),
            names(node.subjects),
            names(node.colours),
            one(node.surface),
            one(node.category),
          ]
            .filter(Boolean)
            .join(', '),
          type: [node.productType, node.year?.value].filter(Boolean).join(' '),
          description: node.description,
          note: node.note?.value ?? '',
          place: node.city?.value ?? '',
        },
      });
    }
    if (!products.pageInfo.hasNextPage) break;
    after = products.pageInfo.endCursor ?? null;
  }

  const artists = new Map<string, ArtistResult>();
  const artistNodes = await storefront
    .query(SEARCH_ARTISTS_QUERY, {cache: storefront.CacheShort()})
    .then(({metaobjects}) => metaobjects.nodes)
    .catch(() => []);
  for (const artist of artistNodes) {
    const name = artist.displayName?.value ?? artist.handle;
    const place = [artist.city?.value, one(artist.state)]
      .filter(Boolean)
      .join(', ');
    const id = `artist:${artist.handle}`;
    artists.set(id, {handle: artist.handle, name, place});
    docs.push({
      id,
      kind: 'artist',
      fields: {
        artist: name,
        place,
        description: [artist.statement?.value, artist.biography?.value]
          .filter(Boolean)
          .join(' '),
      },
    });
  }

  return {index: buildIndex(docs), works, artists, builtAt: Date.now()};
}

async function corpus(storefront: Storefront) {
  if (!cached || Date.now() - cached.builtAt > TTL_MS)
    cached = await buildCorpus(storefront);
  return cached;
}

export async function searchGallery(
  storefront: Storefront,
  query: string,
  limit = 48,
) {
  const {index, works, artists} = await corpus(storefront);
  const hits = search(index, query, limit + 12);
  return {
    works: hits
      .filter((hit) => hit.kind === 'artwork' && works.has(hit.id))
      .slice(0, limit)
      .map((hit) => ({work: works.get(hit.id)!, snippet: hit.snippet})),
    artists: hits
      .filter((hit) => hit.kind === 'artist' && artists.has(hit.id))
      .slice(0, 6)
      .map((hit) => artists.get(hit.id)!),
  };
}

/** The tags in use across the catalogue, most used first: the catalogue's quick filters. */
export async function popularTags(storefront: Storefront, limit = 14) {
  const {index} = await corpus(storefront);
  const counts = new Map<string, {label: string; count: number}>();
  for (const doc of index.docs) {
    for (const tag of (doc.fields.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)) {
      const key = tag.toLowerCase();
      const entry = counts.get(key) ?? {label: tag, count: 0};
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((t) => t.label);
}
