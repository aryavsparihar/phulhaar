/**
 * A stand-in for PJK's artist sign-in endpoints, which do not exist yet.
 *
 * It implements the contract in docs/PJK-INTEGRATION.md closely enough to develop and test against:
 * it checks the HMAC signature and the clock the same way the real thing must, it answers a code
 * request identically whether or not the Artist ID is known, and it signs the token it returns with
 * a throwaway RSA key pair that it generates at start-up and publishes at /.well-known/jwks.json.
 *
 * It is deliberately not a faithful imitation of PJK. It emails nobody -- it prints the code to the
 * terminal, which is the point: a developer can see the code and type it in. Nothing it holds
 * survives a restart.
 *
 * Run it with `pnpm mock:pjk`. Nothing in here is a real secret or a real person.
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {
  generateKeyPairSync,
  createSign,
  randomUUID,
  randomInt,
} from 'node:crypto';

const PORT = Number(process.env.PJK_MOCK_PORT ?? 4010);

/**
 * The secret the mock expects Phulhaar to sign with. It matches the placeholder in .env.example so
 * that a fresh clone works with no configuration; it is not a secret and must never be used
 * anywhere real.
 */
const SHARED_SECRET =
  process.env.PJK_SHARED_SECRET ?? 'mock-pjk-shared-secret-for-local-dev';

const SIGNATURE_WINDOW_SECONDS = 300;

/** The artists the mock knows about. Invented people, for local work only. */
const ARTISTS = new Map<
  string,
  {
    displayName: string;
    standing: 'active' | 'suspended';
    profileVersion: number;
  }
>([
  [
    'AT000123',
    {displayName: 'Sita Devi', standing: 'active', profileVersion: 3},
  ],
  [
    'AT000124',
    {displayName: 'Ramesh Pattnaik', standing: 'active', profileVersion: 1},
  ],
  // Here so the studio's "your account is on hold" path can be exercised.
  [
    'AT000125',
    {displayName: 'Anjali Rao', standing: 'suspended', profileVersion: 2},
  ],
  [
    'PT000001',
    {
      displayName: 'Chitrashala Partners',
      standing: 'active',
      profileVersion: 1,
    },
  ],
]);

/**
 * PJK staff who may also run Phulhaar's admin. On PJK this is "anyone who can sign in to PJK's
 * admin"; Phulhaar additionally refuses any address outside pjk.co.in.
 */
const STAFF = new Map<string, {name: string; role: 'admin' | 'editor'}>([
  ['admin@pjk.co.in', {name: 'Gallery Admin', role: 'admin'}],
  ['curator@pjk.co.in', {name: 'Gallery Curator', role: 'editor'}],
]);

const staffChallenges = new Map<
  string,
  {email: string | null; code: string; expiresAt: number; attempts: number}
>();

/** Live challenges, by id. Cleared on restart, which is fine for a mock. */
const challenges = new Map<
  string,
  {artistId: string | null; code: string; expiresAt: number; attempts: number}
>();

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * A throwaway RSA key pair, made fresh each start-up. Phulhaar verifies the token with the public
 * half, fetched from this server's JWKS endpoint, exactly as it will verify PJK's in production.
 */
const {privateKey, publicKey} = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const KEY_ID = 'mock-pjk-key-1';

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** An RS256 JWT, the same shape PJK must return. */
function signToken(claims: Record<string, unknown>): string {
  const header = base64url(
    JSON.stringify({alg: 'RS256', typ: 'JWT', kid: KEY_ID}),
  );
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      iss: 'https://pjk.co.in',
      aud: 'phulhaar',
      iat: now,
      // Short-lived on purpose: Phulhaar exchanges it immediately for its own session cookie and
      // never stores it, so it only has to survive one round trip.
      exp: now + 120,
      jti: randomUUID(),
      ...claims,
    }),
  );

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = base64url(signer.sign(privateKey));

  return `${header}.${payload}.${signature}`;
}

function jwks() {
  const jwk = publicKey.export({format: 'jwk'}) as {n: string; e: string};
  return {
    keys: [
      {kty: 'RSA', alg: 'RS256', use: 'sig', kid: KEY_ID, n: jwk.n, e: jwk.e},
    ],
  };
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    // A mock still refuses an unbounded body: a runaway loop in the app under development should
    // fail quickly rather than fill this process's memory.
    if (size > 64 * 1024) throw new Error('body too large');
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function send(response: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(json),
    // Nothing here is cacheable and some of it is a credential.
    'cache-control': 'no-store',
  });
  response.end(json);
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload),
  );

  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(body: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(body),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * The same check the real PJK has to make. Getting it wrong in the mock would let a broken client
 * pass locally and fail in production, which is the one thing a mock must not do.
 */
async function signatureIsGood(
  request: IncomingMessage,
  path: string,
  body: string,
): Promise<{ok: true} | {ok: false; reason: string}> {
  const signature = request.headers['x-phulhaar-signature'];
  const timestamp = Number(request.headers['x-phulhaar-timestamp']);

  if (typeof signature !== 'string')
    return {ok: false, reason: 'signature header missing'};
  if (!Number.isFinite(timestamp))
    return {ok: false, reason: 'timestamp header missing'};

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > SIGNATURE_WINDOW_SECONDS) {
    return {ok: false, reason: 'timestamp outside the five-minute window'};
  }

  const expected = await hmacHex(
    SHARED_SECRET,
    `v1.${timestamp}.${request.method?.toUpperCase()}.${path}.${await sha256Hex(body)}`,
  );

  if (expected !== signature)
    return {ok: false, reason: 'signature does not match'};

  return {ok: true};
}

async function handle(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const path = new URL(request.url ?? '/', `http://localhost:${PORT}`).pathname;

  if (request.method === 'GET' && path === '/.well-known/jwks.json') {
    return send(response, 200, jwks());
  }

  if (request.method !== 'POST') {
    return send(response, 405, {code: 'method_not_allowed'});
  }

  let body: string;
  try {
    body = await readBody(request);
  } catch {
    return send(response, 413, {code: 'body_too_large'});
  }

  const signature = await signatureIsGood(request, path, body);
  if (!signature.ok) {
    console.warn(`refused ${request.method} ${path}: ${signature.reason}`);
    return send(response, 401, {code: 'bad_signature'});
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body || '{}') as Record<string, unknown>;
  } catch {
    return send(response, 400, {code: 'malformed_json'});
  }

  if (path === '/next/phulhaar/sign-in/request') {
    const artistId =
      typeof payload.artistId === 'string' ? payload.artistId : '';
    const known = ARTISTS.has(artistId);
    const challengeId = randomUUID();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

    challenges.set(challengeId, {
      // An unknown ID still gets a challenge, with nobody behind it, so the answer cannot be used
      // to find out which IDs exist. The code simply never matches anyone.
      artistId: known ? artistId : null,
      code,
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
      attempts: 0,
    });

    if (known) {
      console.log(
        `\n  one-time code for ${artistId}: ${code}  (challenge ${challengeId})\n`,
      );
    } else {
      console.log(
        `\n  no artist ${artistId || '(blank)'}; answering as though there were\n`,
      );
    }

    return send(response, 200, {challengeId});
  }

  if (path === '/next/phulhaar/sign-in/verify') {
    const challengeId =
      typeof payload.challengeId === 'string' ? payload.challengeId : '';
    const code = typeof payload.code === 'string' ? payload.code : '';
    const challenge = challenges.get(challengeId);

    if (!challenge || challenge.expiresAt < Date.now()) {
      challenges.delete(challengeId);
      return send(response, 400, {code: 'challenge_expired'});
    }

    challenge.attempts += 1;
    if (challenge.attempts > MAX_ATTEMPTS) {
      // Burn the challenge rather than counting for ever: six wrong guesses means start again.
      challenges.delete(challengeId);
      return send(response, 429, {code: 'too_many_attempts'});
    }

    if (code !== challenge.code || challenge.artistId === null) {
      return send(response, 400, {code: 'bad_code'});
    }

    const artist = ARTISTS.get(challenge.artistId)!;
    challenges.delete(challengeId);

    return send(response, 200, {
      token: signToken({
        artistId: challenge.artistId,
        displayName: artist.displayName,
        standing: artist.standing,
        profileVersion: artist.profileVersion,
      }),
    });
  }

  if (path === '/next/phulhaar/staff/sign-in/request') {
    const email =
      typeof payload.email === 'string'
        ? payload.email.trim().toLowerCase()
        : '';
    const known = STAFF.has(email);
    const challengeId = randomUUID();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    staffChallenges.set(challengeId, {
      email: known ? email : null,
      code,
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
      attempts: 0,
    });
    console.log(
      known
        ? `\n  staff code for ${email}: ${code}  (challenge ${challengeId})\n`
        : `\n  no PJK staff ${email || '(blank)'}; answering as though there were\n`,
    );
    return send(response, 200, {challengeId});
  }

  if (path === '/next/phulhaar/staff/sign-in/verify') {
    const challengeId =
      typeof payload.challengeId === 'string' ? payload.challengeId : '';
    const code = typeof payload.code === 'string' ? payload.code : '';
    const challenge = staffChallenges.get(challengeId);
    if (!challenge || challenge.expiresAt < Date.now()) {
      staffChallenges.delete(challengeId);
      return send(response, 400, {code: 'challenge_expired'});
    }
    challenge.attempts += 1;
    if (challenge.attempts > MAX_ATTEMPTS) {
      staffChallenges.delete(challengeId);
      return send(response, 429, {code: 'too_many_attempts'});
    }
    if (code !== challenge.code || challenge.email === null) {
      return send(response, 400, {code: 'bad_code'});
    }
    const staff = STAFF.get(challenge.email)!;
    staffChallenges.delete(challengeId);
    return send(response, 200, {
      token: signToken({
        sub: challenge.email,
        email: challenge.email,
        name: staff.name,
        role: staff.role,
        kind: 'staff',
      }),
    });
  }

  return send(response, 404, {code: 'no_such_endpoint'});
}

/**
 * The handler is async, and Node's createServer ignores the promise it returns. Left that way, a
 * thrown error inside it becomes an unhandled rejection that takes the whole mock down mid-test
 * and leaves the request hanging until it times out, which reads like a bug in the app rather
 * than in the mock. Catching it here answers with a 500 and keeps the server up.
 */
const server = createServer((request, response) => {
  handle(request, response).catch((error: unknown) => {
    console.error('mock PJK failed to handle a request:', error);
    if (!response.headersSent) send(response, 500, {code: 'mock_failed'});
    else response.end();
  });
});

server.listen(PORT, () => {
  console.log(`mock PJK listening on http://localhost:${PORT}`);
  console.log(`  staff: ${[...STAFF.keys()].join(', ')}`);
  console.log(`  artists: ${[...ARTISTS.keys()].join(', ')}`);
  console.log(
    '  codes are printed here instead of emailed; nothing survives a restart\n',
  );
});
