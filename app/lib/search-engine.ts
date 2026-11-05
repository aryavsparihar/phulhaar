/**
 * Phulhaar's own search: every word of every artwork, found from a fragment of it.
 *
 * Shopify's storefront search matches whole words in a few fields. A buyer remembers "the blue
 * one with the peacock, by that woman from Bihar", half spelt. So this indexes everything about a
 * work — title, artist, tags, medium, tradition, subject, colour, the description and the artist's
 * note — and matches each word of the query exactly, by prefix, through a small dictionary of
 * Indian art terms, or with a typo or two, weighting the fields that matter most.
 *
 * Pure and synchronous, so it is tested directly (search-engine.test.ts) and runs in the worker.
 */

export type FieldName =
  | 'title'
  | 'artist'
  | 'tags'
  | 'facets'
  | 'type'
  | 'description'
  | 'note'
  | 'place';

export interface SearchDoc {
  id: string;
  kind: 'artwork' | 'artist';
  fields: Partial<Record<FieldName, string>>;
}

export interface SearchHit {
  id: string;
  kind: SearchDoc['kind'];
  score: number;
  /** Share of the query's words the document matched, 0–1. */
  coverage: number;
  /** A few words of the description or note around the first match, when that is where it was. */
  snippet: string | null;
  matched: string[];
}

const WEIGHTS: Record<FieldName, number> = {
  title: 6,
  artist: 5,
  tags: 4,
  facets: 3.5,
  type: 2.5,
  place: 2,
  note: 1.4,
  description: 1.2,
};

const STOP = new Set(
  'a an and the of in on with by for to from at is are was this that it its or as be my me i'.split(
    ' ',
  ),
);

/** Spellings and names that mean the same thing to a buyer. Each group is searched as one. */
const SYNONYMS: string[][] = [
  ['madhubani', 'mithila'],
  ['pichwai', 'pichhwai', 'pichvai'],
  ['pattachitra', 'patachitra', 'patta'],
  ['tanjore', 'thanjavur'],
  ['kalamkari', 'qalamkari'],
  ['gond', 'gondi'],
  ['phad', 'phad painting'],
  ['krishna', 'krsna', 'kanha', 'shrinathji'],
  ['ganesha', 'ganesh', 'ganpati', 'vinayaka'],
  ['shiva', 'shiv', 'mahadev'],
  ['durga', 'devi', 'goddess'],
  ['peacock', 'mor', 'mayur'],
  ['elephant', 'haathi', 'hathi'],
  ['lotus', 'kamal'],
  ['tree', 'tree of life'],
  ['fish', 'machli'],
  ['painting', 'paintings', 'painted'],
  ['sculpture', 'sculptures', 'statue', 'figurine'],
  ['textile', 'fabric', 'cloth', 'embroidery'],
  ['acrylic', 'acrylics'],
  ['watercolour', 'watercolor', 'water colour'],
  ['colour', 'color'],
  ['grey', 'gray'],
  ['red', 'crimson', 'scarlet', 'maroon'],
  ['blue', 'indigo', 'navy'],
  ['gold', 'golden', 'gilded'],
  ['small', 'little', 'tiny'],
  ['large', 'big', 'huge'],
];

export function normalize(text: string): string {
  return (
    text
      .normalize('NFD')
      // Accents off (Bihār → bihar), the same way for the index and the query, so they agree.
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
  );
}

/** A light stemmer: enough that "peacocks" finds "peacock" and "painted" finds "painting". */
export function stem(word: string): string {
  if (word.length <= 3 || /^\d+$/.test(word)) return word;
  for (const suffix of ['ings', 'ing', 'ies', 'es', 'ed', 's']) {
    if (word.length - suffix.length >= 3 && word.endsWith(suffix)) {
      const base = word.slice(0, -suffix.length);
      return suffix === 'ies' ? `${base}y` : base;
    }
  }
  return word;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((word) => word && !STOP.has(word))
    .map(stem);
}

const SYNONYM_INDEX = (() => {
  const index = new Map<string, Set<string>>();
  for (const group of SYNONYMS) {
    const stems = group.flatMap(tokenize);
    for (const term of stems) {
      const set = index.get(term) ?? new Set<string>();
      for (const other of stems) if (other !== term) set.add(other);
      index.set(term, set);
    }
  }
  return index;
})();

/** Damerau–Levenshtein distance, giving up as soon as it passes `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({length: cols}, (_, j) => j);
  for (let i = 1; i < rows; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, current[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }
      current[j] = value;
      if (value < best) best = value;
    }
    if (best > max) return max + 1;
    prevPrev = prev;
    prev = current;
  }
  return prev[cols - 1];
}

interface Posting {
  doc: number;
  field: FieldName;
  count: number;
}

export interface SearchIndex {
  docs: SearchDoc[];
  postings: Map<string, Posting[]>;
  /** Vocabulary bucketed by first letter, so fuzzy matching does not scan every word. */
  byInitial: Map<string, string[]>;
  fieldLengths: Array<Partial<Record<FieldName, number>>>;
}

export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const postings = new Map<string, Posting[]>();
  const fieldLengths: SearchIndex['fieldLengths'] = [];

  docs.forEach((doc, index) => {
    const lengths: Partial<Record<FieldName, number>> = {};
    for (const [field, text] of Object.entries(doc.fields) as Array<
      [FieldName, string]
    >) {
      if (!text) continue;
      const tokens = tokenize(text);
      lengths[field] = tokens.length;
      const counts = new Map<string, number>();
      for (const token of tokens)
        counts.set(token, (counts.get(token) ?? 0) + 1);
      for (const [token, count] of counts) {
        const list = postings.get(token) ?? [];
        list.push({doc: index, field, count});
        postings.set(token, list);
      }
    }
    fieldLengths.push(lengths);
  });

  const byInitial = new Map<string, string[]>();
  for (const term of postings.keys()) {
    const key = term[0];
    const list = byInitial.get(key) ?? [];
    list.push(term);
    byInitial.set(key, list);
  }
  return {docs, postings, byInitial, fieldLengths};
}

/** The index terms a query word stands for, each with how good a match it is (0–1). */
function expand(
  index: SearchIndex,
  word: string,
  isLast: boolean,
): Map<string, number> {
  const matches = new Map<string, number>();
  const add = (term: string, quality: number) => {
    if (index.postings.has(term) && quality > (matches.get(term) ?? 0))
      matches.set(term, quality);
  };

  add(word, 1);
  for (const synonym of SYNONYM_INDEX.get(word) ?? []) add(synonym, 0.9);

  const candidates = [
    ...(index.byInitial.get(word[0]) ?? []),
    // A typo in the first letter is rarer, but still worth catching for longer words.
    ...(word.length >= 5
      ? [...index.byInitial.entries()]
          .filter(([k]) => k !== word[0])
          .flatMap(([, terms]) => terms)
      : []),
  ];

  for (const term of candidates) {
    if (term === word) continue;
    // Prefix: "peac" finds "peacock". Strongest for the word still being typed.
    if (word.length >= 2 && term.startsWith(word)) {
      add(
        term,
        isLast ? 0.85 : 0.7 - Math.min(0.3, (term.length - word.length) * 0.03),
      );
      continue;
    }
    if (word.length < 4) continue;
    const max = word.length >= 7 ? 2 : 1;
    const distance = editDistance(word, term, max);
    if (distance <= max) add(term, distance === 1 ? 0.65 : 0.45);
    // A misspelt prefix, while typing: "peacck" → "peacock".
    else if (
      isLast &&
      term.length > word.length &&
      editDistance(word, term.slice(0, word.length), 1) <= 1
    ) {
      add(term, 0.5);
    }
  }
  return matches;
}

export function search(
  index: SearchIndex,
  query: string,
  limit = 60,
): SearchHit[] {
  const words = [...new Set(tokenize(query))].slice(0, 12);
  if (words.length === 0) return [];
  const total = index.docs.length || 1;

  const scores = new Map<
    number,
    {score: number; hitWords: Set<number>; terms: Set<string>}
  >();

  words.forEach((word, wordIndex) => {
    const expansions = expand(index, word, wordIndex === words.length - 1);
    const best = new Map<number, number>();
    for (const [term, quality] of expansions) {
      const list = index.postings.get(term)!;
      const docsWithTerm = new Set(list.map((p) => p.doc)).size;
      const idf = Math.log(
        1 + (total - docsWithTerm + 0.5) / (docsWithTerm + 0.5),
      );
      for (const posting of list) {
        const length = index.fieldLengths[posting.doc][posting.field] ?? 1;
        // BM25-style saturation: the fifth mention of a word adds little; a long field dilutes it.
        const tf =
          (posting.count * 2.2) /
          (posting.count + 1.2 * (0.25 + 0.75 * (length / 12)));
        const value = quality * WEIGHTS[posting.field] * idf * tf;
        if (value > (best.get(posting.doc) ?? 0)) best.set(posting.doc, value);
        const entry = scores.get(posting.doc) ?? {
          score: 0,
          hitWords: new Set(),
          terms: new Set(),
        };
        entry.terms.add(term);
        scores.set(posting.doc, entry);
      }
    }
    for (const [doc, value] of best) {
      const entry = scores.get(doc)!;
      entry.score += value;
      entry.hitWords.add(wordIndex);
    }
  });

  const phrase = normalize(query);
  const hits: SearchHit[] = [];
  for (const [docIndex, entry] of scores) {
    if (entry.hitWords.size === 0) continue;
    const doc = index.docs[docIndex];
    const coverage = entry.hitWords.size / words.length;
    let score = entry.score * (0.35 + 0.65 * coverage * coverage);
    if (phrase.length >= 4) {
      if (normalize(doc.fields.title ?? '').includes(phrase)) score *= 1.6;
      else if (normalize(doc.fields.artist ?? '').includes(phrase))
        score *= 1.4;
      else if (
        normalize(
          `${doc.fields.description ?? ''} ${doc.fields.note ?? ''}`,
        ).includes(phrase)
      )
        score *= 1.25;
    }
    hits.push({
      id: doc.id,
      kind: doc.kind,
      score,
      coverage,
      snippet: snippetFor(doc, entry.terms),
      matched: [...entry.terms],
    });
  }

  // Works that match every word first, then by score.
  hits.sort(
    (a, b) =>
      (b.coverage === 1 ? 1 : 0) - (a.coverage === 1 ? 1 : 0) ||
      b.score - a.score,
  );
  const top = hits[0]?.score ?? 0;
  return hits.filter((hit) => hit.score >= top * 0.04).slice(0, limit);
}

/** The sentence fragment that explains why a work came up, if it came up from its prose. */
function snippetFor(doc: SearchDoc, terms: Set<string>): string | null {
  for (const field of ['description', 'note'] as const) {
    const text = doc.fields[field];
    if (!text) continue;
    const words = text.split(/\s+/);
    const at = words.findIndex((word) => {
      const token = tokenize(word)[0];
      return token !== undefined && terms.has(token);
    });
    if (at === -1) continue;
    const start = Math.max(0, at - 6);
    const end = Math.min(words.length, at + 10);
    return `${start > 0 ? '…' : ''}${words.slice(start, end).join(' ')}${end < words.length ? '…' : ''}`;
  }
  return null;
}
