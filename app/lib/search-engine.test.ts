import {describe, expect, it} from 'vitest';
import {
  buildIndex,
  editDistance,
  search,
  stem,
  tokenize,
  type SearchDoc,
} from './search-engine';

const DOCS: SearchDoc[] = [
  {
    id: 'peacock',
    kind: 'artwork',
    fields: {
      title: 'Mor in the Monsoon',
      artist: 'Sita Devi',
      tags: 'Madhubani, peacock, rain',
      facets: 'Natural pigments, Handmade paper, Madhubani',
      description:
        'Two peacocks dance under the first rain of the season, their tails drawn in fine double lines of indigo and saffron.',
      place: 'Madhubani, Bihar',
    },
  },
  {
    id: 'krishna',
    kind: 'artwork',
    fields: {
      title: 'Shrinathji with Cows',
      artist: 'Ramesh Pattnaik',
      tags: 'Pichwai, cows, festival',
      facets: 'Mineral colours, Cotton cloth, Pichwai',
      description:
        'A temple hanging painted for Sharad Purnima, the full moon of autumn, with lotus ponds below.',
    },
  },
  {
    id: 'elephant',
    kind: 'artwork',
    fields: {
      title: 'Forest Elephant',
      artist: 'Anjali Rao',
      tags: 'Gond, elephant, forest',
      facets: 'Acrylic on canvas, Gond',
      description:
        'An elephant made of a thousand dots and dashes, standing in a tree of life.',
    },
  },
  {
    id: 'artist-sita',
    kind: 'artist',
    fields: {
      artist: 'Sita Devi',
      place: 'Ranti, Bihar',
      description: 'Paints in the Kachni style of Mithila.',
    },
  },
];

const index = buildIndex(DOCS);
const ids = (query: string) => search(index, query).map((hit) => hit.id);

describe('tokenize and stem', () => {
  it('drops stop words, folds case and accents, and stems plurals', () => {
    expect(tokenize('The Peacocks of Bihār')).toEqual(['peacock', 'bihar']);
    expect(stem('painted')).toBe('paint');
    expect(stem('stories')).toBe('story');
  });
});

describe('editDistance', () => {
  it('counts a transposition as one edit', () => {
    expect(editDistance('paecock', 'peacock', 2)).toBe(1);
    expect(editDistance('madhubani', 'madubani', 2)).toBe(1);
  });
  it('gives up past the limit', () => {
    expect(editDistance('lotus', 'elephant', 1)).toBe(2);
  });
});

describe('search', () => {
  it('finds a work from one word buried in its description', () => {
    expect(ids('saffron')[0]).toBe('peacock');
    expect(ids('full moon autumn')[0]).toBe('krishna');
  });

  it('forgives typos', () => {
    expect(ids('paecock')[0]).toBe('peacock');
    expect(ids('elefant')[0]).toBe('elephant');
    expect(ids('pichwaii')[0]).toBe('krishna');
  });

  it('matches what is still being typed', () => {
    expect(ids('peac')[0]).toBe('peacock');
    expect(ids('sita d')).toContain('peacock');
  });

  it('knows the other names for things', () => {
    expect(ids('mithila')).toContain('peacock');
    expect(ids('krishna')[0]).toBe('krishna');
    expect(ids('haathi')[0]).toBe('elephant');
  });

  it('puts works that match every word ahead of ones that match some', () => {
    const results = ids('elephant tree');
    expect(results[0]).toBe('elephant');
  });

  it('finds artists as well as works', () => {
    expect(ids('sita')).toContain('artist-sita');
  });

  it('explains a match from the prose with a snippet', () => {
    const hit = search(index, 'indigo')[0];
    expect(hit.snippet).toContain('indigo');
  });

  it('returns nothing for nothing', () => {
    expect(search(index, '   ')).toEqual([]);
    expect(search(index, 'zzzzqqqq')).toEqual([]);
  });
});
