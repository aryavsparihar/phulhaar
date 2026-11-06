import {describe, expect, it} from 'vitest';
import {
  dominantColours,
  fromHex,
  nearestColour,
  suggestColours,
  toHex,
} from '~/lib/colour';

/** A width × height image: a white border (the wall), filled inside by `paint`. */
function image(
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number],
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge =
        x < width * 0.12 ||
        x >= width * 0.88 ||
        y < height * 0.12 ||
        y >= height * 0.88;
      const [r, g, b] = edge ? [250, 250, 248] : paint(x, y);
      const i = (y * width + x) * 4;
      data.set([r, g, b, 255], i);
    }
  }
  return data;
}

describe('hex', () => {
  it('round-trips', () => {
    expect(toHex([184, 49, 47])).toBe('#b8312f');
    expect(fromHex('#B8312F')).toEqual([184, 49, 47]);
    expect(fromHex('red')).toBeNull();
  });
});

describe('nearestColour', () => {
  it('names a shade by the gallery palette', () => {
    expect(nearestColour('#cc2222')).toBe('red');
    expect(nearestColour('#1f2a7a')).toBe('indigo');
    expect(nearestColour('#2e8b57')).toBe('green');
    expect(nearestColour('#d4a017')).toBe('gold');
    expect(nearestColour('#101010')).toBe('black');
    expect(nearestColour('#7f7f7f')).toBe('grey');
    expect(nearestColour('not a colour')).toBe('grey');
  });
});

describe('dominantColours', () => {
  it('ignores the white wall around the work', () => {
    const data = image(100, 100, () => [30, 40, 130]);
    const [first] = dominantColours(data, 100, 100);
    expect(nearestColour(first.hex)).toBe('indigo');
    expect(first.share).toBeGreaterThan(0.95);
  });
  it('gives nothing for an image that is all backdrop', () => {
    expect(
      dominantColours(
        image(40, 40, () => [255, 255, 255]),
        40,
        40,
      ),
    ).toEqual([]);
  });
});

describe('suggestColours', () => {
  it('suggests the main colours of a two-colour work, most first', () => {
    // Left two thirds red, right third gold.
    const data = image(90, 90, (x) =>
      x < 60 ? [190, 40, 40] : [200, 155, 40],
    );
    expect(suggestColours(data, 90, 90)).toEqual(['red', 'gold']);
  });
  it('calls a work with no leading colour multicoloured', () => {
    const hues: Array<[number, number, number]> = [
      [190, 40, 40],
      [40, 140, 70],
      [40, 110, 190],
      [140, 70, 170],
      [230, 120, 30],
      [230, 200, 30],
      [230, 140, 170],
      [100, 65, 35],
    ];
    const data = image(
      160,
      160,
      (x, y) => hues[(Math.floor(x / 10) + Math.floor(y / 10)) % hues.length],
    );
    expect(suggestColours(data, 160, 160)).toEqual(['multicoloured']);
  });
});
