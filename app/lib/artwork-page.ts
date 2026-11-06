/**
 * The artwork page's logic, kept apart from React so it is tested directly
 * (artwork-page.test.ts): the enquiry email, the structured data, the to-scale room, and the
 * visitor's recently viewed list.
 */

export interface ArtworkFacts {
  title: string;
  url: string;
  artist: string | null;
  year: string | null;
  medium: string | null;
  surface: string | null;
  dimensions: string | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  description: string | null;
  images: string[];
  price: {amount: string; currencyCode: string} | null;
  available: boolean;
}

/** "mailto:" with a subject and a body that already says which work, so nobody has to ask. */
export function enquiryMailto(email: string, work: ArtworkFacts): string {
  const by = work.artist ? ` by ${work.artist}` : '';
  const subject = work.available
    ? `Enquiry: ${work.title}${by}`
    : `Similar works${by} (${work.title} is sold)`;
  const facts = [
    work.title,
    work.artist,
    [work.medium, work.year].filter(Boolean).join(', ') || null,
    work.dimensions,
    work.url,
  ].filter(Boolean);
  const opening = work.available
    ? 'I would like to know more about this work:'
    : `This work has sold. I would like to hear about similar works${by}:`;
  const body = `Hello,\n\n${opening}\n\n${facts.join('\n')}\n\nThank you.`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Centimetres as schema.org wants them. */
function measure(cm: number | null) {
  return cm
    ? {'@type': 'QuantitativeValue', value: cm, unitCode: 'CMT'}
    : undefined;
}

/** VisualArtwork + Product + Offer, so search engines read it as an artwork that is for sale. */
export function artworkJsonLd(work: ArtworkFacts) {
  const artist = work.artist
    ? {'@type': 'Person', name: work.artist}
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': ['VisualArtwork', 'Product'],
    name: work.title,
    url: work.url,
    image: work.images.length ? work.images : undefined,
    description: work.description || undefined,
    artist,
    creator: artist,
    brand: {'@type': 'Brand', name: 'Phulhaar Gallery'},
    dateCreated: work.year || undefined,
    artMedium: work.medium || undefined,
    artworkSurface: work.surface || undefined,
    height: measure(work.heightCm),
    width: measure(work.widthCm),
    depth: measure(work.depthCm),
    offers: work.price
      ? {
          '@type': 'Offer',
          url: work.url,
          price: work.price.amount,
          priceCurrency: work.price.currencyCode,
          availability: work.available
            ? 'https://schema.org/InStock'
            : 'https://schema.org/SoldOut',
          itemCondition: 'https://schema.org/NewCondition',
        }
      : undefined,
  };
}

/** JSON safe inside a <script> element: no "</script>" or "<!--" can end it early. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Everything in a room view, in centimetres from the wall's top-left corner. */
export interface RoomLayout {
  wall: {width: number; height: number};
  art: {x: number; y: number; width: number; height: number};
  bench: {x: number; y: number; width: number; height: number};
  person: {x: number; height: number};
}

const WALL = {width: 300, height: 240};
/** Galleries hang to a common centre line, about eye height. */
const CENTRE_LINE = 145;
const BENCH = {width: 120, height: 45};
const PERSON = 170;

/**
 * The work at its true size on a 300 × 240 cm wall, centred on the gallery's eye line, with a
 * bench and a 1.7 m figure for scale. A work too big for that wall gets a bigger wall rather
 * than being shrunk, so the scale is always true.
 */
export function roomLayout(heightCm: number, widthCm: number): RoomLayout {
  const margin = 30;
  const wallWidth = Math.max(WALL.width, widthCm + 2 * margin + 70);
  const wallHeight = Math.max(WALL.height, heightCm + 2 * margin);
  const floor = wallHeight;
  // Centre on the eye line, but never closer than 20 cm to the floor or 15 cm to the ceiling.
  let centreFromFloor = Math.max(CENTRE_LINE, heightCm / 2 + 20);
  centreFromFloor = Math.min(centreFromFloor, wallHeight - heightCm / 2 - 15);
  const artX = (wallWidth - widthCm) / 2;
  const artY = floor - centreFromFloor - heightCm / 2;
  const benchWidth = Math.min(BENCH.width, Math.max(60, widthCm));
  return {
    wall: {width: wallWidth, height: wallHeight},
    art: {x: artX, y: artY, width: widthCm, height: heightCm},
    bench: {
      x: (wallWidth - benchWidth) / 2,
      y: floor - BENCH.height,
      width: benchWidth,
      height: BENCH.height,
    },
    // To the left of the work, clear of it.
    person: {x: Math.max(15, artX - 55), height: PERSON},
  };
}

export interface RecentWork {
  handle: string;
  title: string;
  artist: string | null;
  image: string | null;
}

export const RECENT_KEY = 'phulhaar:recently-viewed';
const RECENT_MAX = 12;

/** The list with this work first, without a duplicate, and no longer than it should be. */
export function addRecent(list: RecentWork[], work: RecentWork): RecentWork[] {
  return [work, ...list.filter((item) => item.handle !== work.handle)].slice(
    0,
    RECENT_MAX,
  );
}

/** Only Shopify's own image CDN, over https: what this code stored, never something injected. */
function shopifyImage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'cdn.shopify.com'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/** What was stored, if it is still in the shape this code writes; anything else is dropped. */
export function parseRecent(raw: string | null): RecentWork[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is RecentWork =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as RecentWork).handle === 'string' &&
          /^[a-z0-9-]+$/.test((item as RecentWork).handle) &&
          typeof (item as RecentWork).title === 'string',
      )
      .map((item) => ({
        handle: item.handle,
        title: item.title,
        artist: typeof item.artist === 'string' ? item.artist : null,
        image: shopifyImage(item.image),
      }))
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}
