import {describe, expect, it} from 'vitest';
import {
  directoryGroups,
  directoryHref,
  letterOf,
  matchesName,
  NO_STATE,
  parseDirectoryQuery,
  statesInUse,
  type DirectoryArtist,
} from '~/lib/artist-directory';

const artist = (
  name: string,
  state: string | null,
  city: string | null = null,
): DirectoryArtist => ({
  handle: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  city,
  state,
});

const artists = [
  artist('Sita Devi', 'Bihar', 'Madhubani'),
  artist('Bhajju Shyam', 'Madhya Pradesh', 'Bhopal'),
  artist('Āditi Rao', 'Karnataka'),
  artist('Santosh Kumar', 'Bihar'),
  artist('मीरा', null),
];
const query = (search: string) =>
  parseDirectoryQuery(new URLSearchParams(search));

describe('letterOf', () => {
  it('files accented names under their letter and other scripts under #', () => {
    expect(letterOf('Āditi')).toBe('A');
    expect(letterOf('sita')).toBe('S');
    expect(letterOf('मीरा')).toBe('#');
  });
});

describe('A–Z', () => {
  it('groups by first letter, sorted, with # last', () => {
    const groups = directoryGroups(artists, query(''));
    expect(groups.map((g) => g.key)).toEqual(['A', 'B', 'S', '#']);
    expect(
      groups.find((g) => g.key === 'S')?.artists.map((a) => a.name),
    ).toEqual(['Santosh Kumar', 'Sita Devi']);
  });
  it('narrows to one letter', () => {
    expect(
      directoryGroups(artists, query('letter=b')).map((g) => g.key),
    ).toEqual(['B']);
  });
});

describe('by state', () => {
  it('groups by state with artists without one last', () => {
    const groups = directoryGroups(artists, query('view=state'));
    expect(groups.map((g) => g.key)).toEqual([
      'Bihar',
      'Karnataka',
      'Madhya Pradesh',
      NO_STATE,
    ]);
    expect(statesInUse(artists)[0]).toEqual({state: 'Bihar', count: 2});
  });
  it('narrows to one state', () => {
    const groups = directoryGroups(artists, query('view=state&state=Bihar'));
    expect(groups).toHaveLength(1);
    expect(groups[0].artists).toHaveLength(2);
  });
});

describe('name filter', () => {
  it('matches the start of each word typed, by name or place, ignoring accents', () => {
    expect(matchesName(artists[0], 'sit dev')).toBe(true);
    expect(matchesName(artists[0], 'madhu')).toBe(true);
    expect(matchesName(artists[2], 'aditi')).toBe(true);
    expect(matchesName(artists[0], 'ita')).toBe(false);
    expect(
      directoryGroups(artists, query('name=bhopal'))[0].artists[0].name,
    ).toBe('Bhajju Shyam');
  });
});

describe('directoryHref', () => {
  it('keeps only what matters for the view', () => {
    expect(directoryHref(query('view=state&state=Bihar&letter=S'))).toBe(
      '/artists?view=state&state=Bihar',
    );
    expect(directoryHref(query('letter=s&name=sita'))).toBe(
      '/artists?letter=S&name=sita',
    );
    expect(directoryHref(query(''))).toBe('/artists');
  });
});
