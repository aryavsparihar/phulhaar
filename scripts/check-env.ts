/**
 * Fails if `.env.example` and the schema in `app/lib/env.server.ts` have drifted apart.
 *
 * The point is documentation that cannot rot. A variable added to the schema but not to the
 * example leaves the next person guessing; one left in the example after the code stopped reading
 * it sends them looking for a value nobody needs. CI runs this, so neither survives a pull
 * request.
 *
 * Run it with `pnpm check:env`.
 */

import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ENV_KEYS} from '../app/lib/env.server.ts';

const examplePath = fileURLToPath(new URL('../.env.example', import.meta.url));

/** Variable names assigned in a dotenv file, ignoring comments and blank lines. */
function namesIn(contents: string): string[] {
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim())
    .filter((name) => /^[A-Z][A-Z0-9_]*$/.test(name));
}

const documented = new Set(namesIn(readFileSync(examplePath, 'utf8')));
const known = new Set(ENV_KEYS);

const undocumented = [...known].filter((key) => !documented.has(key)).sort();
const unused = [...documented].filter((key) => !known.has(key)).sort();

if (undocumented.length === 0 && unused.length === 0) {
  console.log(
    `Every one of the ${known.size} environment variables is documented.`,
  );
  process.exit(0);
}

if (undocumented.length > 0) {
  console.error('Read by the code but missing from .env.example:');
  for (const key of undocumented) console.error(`  - ${key}`);
}

if (unused.length > 0) {
  console.error('In .env.example but not read by the code:');
  for (const key of unused) console.error(`  - ${key}`);
}

console.error('\nAdd it in both places, or remove it from both.');
process.exit(1);
