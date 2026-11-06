/**
 * The colours a photograph of a work reads as, for the colour filter.
 *
 * Runs in the browser on the pixels of the preview canvas when staff choose a photograph, so it
 * costs nothing on the server and the result is shown before anything is saved. Pure and
 * synchronous, so it is tested directly (colour.test.ts).
 */

/** The gallery's colour taxonomy (scripts/shopify/definitions.ts), with a reference shade each. */
export const PALETTE: ReadonlyArray<{handle: string; hex: string}> = [
  {handle: 'red', hex: '#b8312f'},
  {handle: 'pink', hex: '#e08aa8'},
  {handle: 'orange', hex: '#e2771f'},
  {handle: 'yellow', hex: '#ecc919'},
  {handle: 'gold', hex: '#c49a2c'},
  {handle: 'green', hex: '#3c8a4e'},
  {handle: 'blue', hex: '#2f78bd'},
  {handle: 'indigo', hex: '#33307f'},
  {handle: 'violet', hex: '#8a4aa8'},
  {handle: 'brown', hex: '#6b4426'},
  {handle: 'ochre', hex: '#c47f2e'},
  {handle: 'black', hex: '#1b1b1b'},
  {handle: 'white', hex: '#f3f0e8'},
  {handle: 'grey', hex: '#8a8a8a'},
];

type RGB = [number, number, number];

export function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

export function fromHex(hex: string): RGB | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lightness and saturation, 0–1, enough to tell a white mount from a pale wash. */
function lightSat([r, g, b]: RGB) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return {l, s};
}

/** sRGB to CIELAB, so "nearest" means nearest to the eye rather than to the arithmetic. */
function toLab([r, g, b]: RGB): RGB {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const PALETTE_LAB = PALETTE.map((entry) => ({
  ...entry,
  lab: toLab(fromHex(entry.hex)!),
}));

/** The palette colour a shade is closest to. */
export function nearestColour(hex: string): string {
  const rgb = fromHex(hex);
  if (!rgb) return 'grey';
  const [L, A, B] = toLab(rgb);
  let best = PALETTE_LAB[0];
  let bestDistance = Infinity;
  for (const entry of PALETTE_LAB) {
    const [l, a, b] = entry.lab;
    const distance = (L - l) ** 2 + (A - a) ** 2 + (B - b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }
  return best.handle;
}

/** A backdrop pixel: the white wall or mount a work is photographed against. */
function isBackdrop(rgb: RGB) {
  const {l, s} = lightSat(rgb);
  return l > 0.9 && s < 0.25;
}

export interface Swatch {
  hex: string;
  /** Share of the work's own pixels, 0–1. */
  share: number;
}

/**
 * The main colours of an image, most present first.
 *
 * The outer tenth on every side is skipped (where the wall, mount and frame are), as are
 * near-white neutral pixels anywhere. What is left is bucketed at 4 bits a channel and each
 * bucket averaged, so a hundred slightly different reds read as one red.
 */
export function dominantColours(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  limit = 5,
): Swatch[] {
  const inset = (n: number) => Math.floor(n * 0.1);
  const x0 = inset(width);
  const y0 = inset(height);
  const x1 = width - x0;
  const y1 = height - y0;
  // Every pixel of a thumbnail, every few of a large image: the answer does not change.
  const step = Math.max(
    1,
    Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 40000)),
  );

  const buckets = new Map<
    number,
    {r: number; g: number; b: number; n: number}
  >();
  let counted = 0;
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue; // transparent
      const rgb: RGB = [data[i], data[i + 1], data[i + 2]];
      if (isBackdrop(rgb)) continue;
      const key = ((rgb[0] >> 4) << 8) | ((rgb[1] >> 4) << 4) | (rgb[2] >> 4);
      const bucket = buckets.get(key) ?? {r: 0, g: 0, b: 0, n: 0};
      bucket.r += rgb[0];
      bucket.g += rgb[1];
      bucket.b += rgb[2];
      bucket.n += 1;
      buckets.set(key, bucket);
      counted += 1;
    }
  }
  if (!counted) return [];
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((bucket) => ({
      hex: toHex([
        bucket.r / bucket.n,
        bucket.g / bucket.n,
        bucket.b / bucket.n,
      ]),
      share: bucket.n / counted,
    }));
}

/**
 * The gallery colours to suggest: the palette colours that together cover at least a sixth of
 * the work each, at most three. When no colour does, the work is multicoloured.
 */
export function suggestColours(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string[] {
  const shares = new Map<string, number>();
  for (const swatch of dominantColours(data, width, height, Infinity)) {
    const handle = nearestColour(swatch.hex);
    shares.set(handle, (shares.get(handle) ?? 0) + swatch.share);
  }
  const ranked = [...shares.entries()].sort((a, b) => b[1] - a[1]);
  const strong = ranked.filter(([, share]) => share >= 1 / 6).slice(0, 3);
  if (strong.length) return strong.map(([handle]) => handle);
  return ranked.length ? ['multicoloured'] : [];
}
