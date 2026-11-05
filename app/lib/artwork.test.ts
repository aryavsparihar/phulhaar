import {describe, expect, it} from 'vitest';
import {
  artworkHandle,
  formatDimensions,
  longestSideCm,
  orientationOf,
  sizeBandOf,
  slugify,
  toInches,
} from '~/lib/artwork';

describe('orientationOf', () => {
  it('reads taller than wide as portrait, and wider than tall as landscape', () => {
    expect(orientationOf({heightCm: 90, widthCm: 60})).toBe('portrait');
    expect(orientationOf({heightCm: 60, widthCm: 90})).toBe('landscape');
  });

  it('calls an exact square square', () => {
    expect(orientationOf({heightCm: 50, widthCm: 50})).toBe('square');
  });

  it('absorbs the half-centimetre a stretched canvas is never measured closer than', () => {
    // 0.5 cm out over 60.5 is inside the one per cent tolerance of 0.605 cm.
    expect(orientationOf({heightCm: 60.5, widthCm: 60})).toBe('square');
  });

  it('keeps the tolerance tight enough that a visibly taller work stays portrait', () => {
    // 1 cm out over 61 is already beyond 0.61 cm, so this is not called square.
    expect(orientationOf({heightCm: 61, widthCm: 60})).toBe('portrait');
    expect(orientationOf({heightCm: 65, widthCm: 60})).toBe('portrait');
  });

  it('refuses a measurement that cannot be real', () => {
    expect(() => orientationOf({heightCm: 0, widthCm: 60})).toThrow(RangeError);
    expect(() => orientationOf({heightCm: -5, widthCm: 60})).toThrow(
      RangeError,
    );
    expect(() => orientationOf({heightCm: Number.NaN, widthCm: 60})).toThrow(
      RangeError,
    );
  });
});

describe('sizeBandOf', () => {
  it('bands by the longest side', () => {
    expect(sizeBandOf({heightCm: 30, widthCm: 20})).toBe('small');
    expect(sizeBandOf({heightCm: 60, widthCm: 40})).toBe('medium');
    expect(sizeBandOf({heightCm: 120, widthCm: 80})).toBe('large');
    expect(sizeBandOf({heightCm: 200, widthCm: 150})).toBe('oversized');
  });

  it('puts a work exactly on a boundary in the upper band, so the counts add up', () => {
    expect(sizeBandOf({heightCm: 44.9, widthCm: 20})).toBe('small');
    expect(sizeBandOf({heightCm: 45, widthCm: 20})).toBe('medium');
    expect(sizeBandOf({heightCm: 90, widthCm: 20})).toBe('large');
    expect(sizeBandOf({heightCm: 150, widthCm: 20})).toBe('oversized');
  });

  it('counts depth, so a deep sculpture is not banded as though it were flat', () => {
    expect(longestSideCm({heightCm: 30, widthCm: 30, depthCm: 100})).toBe(100);
    expect(sizeBandOf({heightCm: 30, widthCm: 30, depthCm: 100})).toBe('large');
  });
});

describe('toInches', () => {
  it('rounds to the nearest quarter', () => {
    expect(toInches(2.54)).toBe(1);
    expect(toInches(60)).toBe(23.5);
    expect(toInches(45)).toBe(17.75);
  });
});

describe('formatDimensions', () => {
  it('reads like a gallery label', () => {
    expect(formatDimensions({heightCm: 60, widthCm: 45})).toBe(
      '60 × 45 cm (23½ × 17¾ in)',
    );
  });

  it('includes depth only when there is one', () => {
    expect(
      formatDimensions({heightCm: 30, widthCm: 30, depthCm: 10}),
    ).toContain('30 × 30 × 10 cm');
    expect(formatDimensions({heightCm: 30, widthCm: 30})).toBe(
      '30 × 30 cm (11¾ × 11¾ in)',
    );
  });

  it('does not print a trailing zero on a whole number', () => {
    expect(formatDimensions({heightCm: 45.5, widthCm: 30})).toContain(
      '45.5 × 30 cm',
    );
  });
});

describe('slugify', () => {
  it('strips accents rather than dropping the letter', () => {
    expect(slugify('Café Chitrakār')).toBe('cafe-chitrakar');
  });

  it('collapses punctuation and spaces into single hyphens', () => {
    expect(slugify('  Monsoon — II (study) ')).toBe('monsoon-ii-study');
  });

  it('returns nothing for a title with no Latin letters at all', () => {
    expect(slugify('मधुबनी')).toBe('');
  });
});

describe('artworkHandle', () => {
  it('builds artist-title-year', () => {
    expect(
      artworkHandle({
        artistName: 'Sita Devi',
        title: 'Monsoon Garden',
        year: 2025,
      }),
    ).toBe('sita-devi-monsoon-garden-2025');
  });

  it('leaves the year off when the work is undated', () => {
    expect(
      artworkHandle({artistName: 'Sita Devi', title: 'Monsoon Garden'}),
    ).toBe('sita-devi-monsoon-garden');
  });

  it('falls back to a usable handle rather than an empty one', () => {
    expect(
      artworkHandle({artistName: 'मधुबनी', title: 'मधुबनी', year: 2024}),
    ).toBe('artwork-2024');
  });
});
