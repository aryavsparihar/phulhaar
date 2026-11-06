/**
 * The artist directory's grouping and filtering: A–Z with letter headings, or by Indian state.
 * Pure, so it is tested directly (artist-directory.test.ts) and runs the same on server and client.
 */

export interface DirectoryArtist {
  handle: string;
  name: string;
  city: string | null;
  state: string | null;
}

export type DirectoryView = 'az' | 'state';

export interface DirectoryQuery {
  view: DirectoryView;
  letter: string | null;
  state: string | null;
  name: string;
}

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
/** Names that do not start with a Latin letter (in Devanagari, say) file under this. */
export const OTHER = '#';
export const NO_STATE = 'State not given';

const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** "Ā" files under A; a name in another script files under #. */
export function letterOf(name: string): string {
  const first = fold(name).charAt(0).toUpperCase();
  return LETTERS.includes(first) ? first : OTHER;
}

export function parseDirectoryQuery(params: URLSearchParams): DirectoryQuery {
  const letter = params.get('letter')?.toUpperCase() ?? null;
  return {
    view: params.get('view') === 'state' ? 'state' : 'az',
    letter:
      letter && (LETTERS.includes(letter) || letter === OTHER) ? letter : null,
    state: params.get('state')?.trim().slice(0, 60) || null,
    name: params.get('name')?.trim().slice(0, 60) ?? '',
  };
}

/** Every word typed must start a word of the name or place: "sit dev" finds "Sita Devi". */
export function matchesName(artist: DirectoryArtist, typed: string): boolean {
  const words = fold(typed).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold(
    [artist.name, artist.city, artist.state].filter(Boolean).join(' '),
  ).split(/[^\p{L}\p{N}]+/u);
  return words.every((word) => haystack.some((part) => part.startsWith(word)));
}

const byName = (a: DirectoryArtist, b: DirectoryArtist) =>
  a.name.localeCompare(b.name, 'en-IN', {sensitivity: 'base'});

export interface DirectoryGroup<T extends DirectoryArtist = DirectoryArtist> {
  key: string;
  label: string;
  artists: T[];
}

/** The letters that have at least one artist, for the jump bar. */
export function lettersInUse(artists: DirectoryArtist[]): Set<string> {
  return new Set(artists.map((artist) => letterOf(artist.name)));
}

/** States with how many artists each, most first, for the state chips. */
export function statesInUse(artists: DirectoryArtist[]) {
  const counts = new Map<string, number>();
  for (const artist of artists) {
    const state = artist.state || NO_STATE;
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([state, count]) => ({state, count}))
    .sort(
      (a, b) =>
        Number(a.state === NO_STATE) - Number(b.state === NO_STATE) ||
        a.state.localeCompare(b.state, 'en-IN'),
    );
}

/** The directory as it should show for this query: filtered, then grouped. */
export function directoryGroups<T extends DirectoryArtist>(
  artists: T[],
  query: DirectoryQuery,
): Array<DirectoryGroup<T>> {
  const named = artists.filter((artist) => matchesName(artist, query.name));

  if (query.view === 'state') {
    const groups = new Map<string, T[]>();
    for (const artist of named) {
      const state = artist.state || NO_STATE;
      if (query.state && state !== query.state) continue;
      groups.set(state, [...(groups.get(state) ?? []), artist]);
    }
    return [...groups.entries()]
      .sort(
        ([a], [b]) =>
          Number(a === NO_STATE) - Number(b === NO_STATE) ||
          a.localeCompare(b, 'en-IN'),
      )
      .map(([state, list]) => ({
        key: state,
        label: state,
        artists: list.sort(byName),
      }));
  }

  const groups = new Map<string, T[]>();
  for (const artist of named) {
    const letter = letterOf(artist.name);
    if (query.letter && letter !== query.letter) continue;
    groups.set(letter, [...(groups.get(letter) ?? []), artist]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) =>
      a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b),
    )
    .map(([letter, list]) => ({
      key: letter,
      label: letter,
      artists: list.sort(byName),
    }));
}

/** The /artists address for a query; defaults are left out so links stay short. */
export function directoryHref(query: DirectoryQuery): string {
  const params = new URLSearchParams();
  if (query.view === 'state') params.set('view', 'state');
  if (query.view === 'az' && query.letter) params.set('letter', query.letter);
  if (query.view === 'state' && query.state) params.set('state', query.state);
  if (query.name) params.set('name', query.name);
  const search = params.toString();
  return `/artists${search ? `?${search}` : ''}`;
}
