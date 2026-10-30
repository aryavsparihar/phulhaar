/**
 * The rules that turn what an artist types into what a buyer filters on.
 *
 * Orientation, size band and the inch equivalents are all derived from the dimensions, so none of
 * them is a field an artist fills in and none can disagree with the measurements. They are
 * computed here, written to metafields when a work is submitted, and read back by Shopify's
 * Search & Discovery filters -- which can only filter on a stored value, not on a calculation, so
 * the computation has to happen on the way in.
 *
 * Everything here is plain TypeScript with no Shopify or Oxygen dependency, so it is unit-tested
 * directly and can be reused by the setup script and the studio alike.
 */

/** Centimetres are what artists are asked for, and what the metafields store. */
export interface Dimensions {
  heightCm: number;
  widthCm: number;
  /** Depth is absent for anything flat. A canvas on a stretcher has one; a drawing does not. */
  depthCm?: number;
}

export type Orientation = 'portrait' | 'landscape' | 'square';

export type SizeBand = 'small' | 'medium' | 'large' | 'oversized';

/**
 * The bands, by the longest side in centimetres. Upper bounds are exclusive, so a work exactly 45
 * cm across is medium and one exactly 90 cm is large; without that rule a work on a boundary
 * would belong to two bands and the filter counts would not add up.
 *
 * These four are a starting point taken from the brief and still to be confirmed. Changing them
 * means recomputing the band on every live work, so `scripts/shopify-setup.ts` keeps the choice
 * in one place.
 */
export const SIZE_BANDS: ReadonlyArray<{band: SizeBand; underCm: number}> = [
  {band: 'small', underCm: 45},
  {band: 'medium', underCm: 90},
  {band: 'large', underCm: 150},
  {band: 'oversized', underCm: Number.POSITIVE_INFINITY},
];

const CM_PER_INCH = 2.54;

/**
 * A square is a deliberate band rather than an exact equality: a canvas measured at 60 by 61 cm is
 * square to anyone looking at it, and calling it a portrait would put it in a filter where it
 * looks out of place. One per cent of the longer side is the tolerance.
 */
const SQUARE_TOLERANCE = 0.01;

function assertUsable(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `${name} must be a positive number of centimetres, not ${value}`,
    );
  }
}

/** The longest of the measured sides, which is what the size band is read from. */
export function longestSideCm({
  heightCm,
  widthCm,
  depthCm,
}: Dimensions): number {
  assertUsable(heightCm, 'height');
  assertUsable(widthCm, 'width');
  if (depthCm !== undefined) assertUsable(depthCm, 'depth');

  return Math.max(heightCm, widthCm, depthCm ?? 0);
}

export function orientationOf({heightCm, widthCm}: Dimensions): Orientation {
  assertUsable(heightCm, 'height');
  assertUsable(widthCm, 'width');

  const longer = Math.max(heightCm, widthCm);
  if (Math.abs(heightCm - widthCm) <= longer * SQUARE_TOLERANCE)
    return 'square';

  return heightCm > widthCm ? 'portrait' : 'landscape';
}

export function sizeBandOf(dimensions: Dimensions): SizeBand {
  const longest = longestSideCm(dimensions);
  // The bands are in ascending order, so the first one the work fits under is its band.
  return SIZE_BANDS.find(({underCm}) => longest < underCm)!.band;
}

/**
 * Inches, shown beside the centimetres because buyers who frame their own work think in them.
 * Rounded to a quarter: a wall measurement is never more precise than that, and "23.62 in" reads
 * like a conversion rather than a size.
 */
export function toInches(cm: number): number {
  assertUsable(cm, 'measurement');
  return Math.round((cm / CM_PER_INCH) * 4) / 4;
}

/** "60 × 45 cm (23½ × 17¾ in)", the way a gallery label reads. */
export function formatDimensions(dimensions: Dimensions): string {
  const {heightCm, widthCm, depthCm} = dimensions;
  const sides =
    depthCm === undefined ? [heightCm, widthCm] : [heightCm, widthCm, depthCm];

  const cm = sides.map((side) => trimNumber(side)).join(' × ');
  const inches = sides.map((side) => formatInches(toInches(side))).join(' × ');

  return `${cm} cm (${inches} in)`;
}

/** Quarters as fractions, because "17¾" is how the measurement is spoken. */
const QUARTERS = ['', '¼', '½', '¾'] as const;

function formatInches(value: number): string {
  const whole = Math.floor(value);
  const quarter = Math.round((value - whole) * 4);
  if (quarter === 0) return String(whole);
  if (quarter === 4) return String(whole + 1);
  return `${whole === 0 ? '' : whole}${QUARTERS[quarter]}`;
}

/** 45 rather than 45.0, and 45.5 kept as it is. */
function trimNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(1)));
}

/**
 * The product handle, which is the artwork's URL and therefore permanent.
 *
 * `artist-name-title-year` reads well, tells a search engine what the page is, and stays unique
 * enough in practice -- two works by one artist with the same title in the same year are rare, and
 * Shopify refuses a duplicate handle, so the studio asks for a different title rather than
 * silently appending a number.
 *
 * Devanagari and other non-Latin titles transliterate badly and would produce an empty handle, so
 * anything that reduces to nothing falls back to the word "artwork" and the caller is expected to
 * give the work a Latin title for its URL.
 */
export function artworkHandle({
  artistName,
  title,
  year,
}: {
  artistName: string;
  title: string;
  year?: number;
}): string {
  const parts = [slugify(artistName), slugify(title)].filter(
    (part) => part.length > 0,
  );
  if (parts.length === 0) parts.push('artwork');
  if (year !== undefined) parts.push(String(year));

  return parts.join('-');
}

/** Lower case, accents stripped, anything that is not a letter or digit turned into one hyphen. */
export function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      // Combining marks, left behind once NFKD has split the accents off their letters.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}
