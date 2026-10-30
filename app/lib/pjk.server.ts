/**
 * Phulhaar's side of the PJK integration. The contract it implements is docs/PJK-INTEGRATION.md,
 * and the endpoints it calls do not exist on PJK yet -- `mocks/pjk` stands in for them until they
 * do.
 *
 * PJK is the identity provider. It holds artists' email addresses, their KYC and their bank
 * details, and Phulhaar is deliberately built so that it never sees any of them: an artist proves
 * who they are by typing an Artist ID here and a code that PJK emailed them, and all Phulhaar ever
 * learns is the ID, a display name and whether the artist is in good standing.
 *
 * Everything here runs on the server only. The shared secret must never reach a browser, which is
 * what the `.server` suffix enforces -- Hydrogen refuses to bundle such a module for the client.
 *
 * Web Crypto is used rather than Node's `crypto`, because this code runs in workerd on Oxygen,
 * where Node's module is not available.
 */

/** The shape every Artist ID takes. PT is for partners; AT is an artist. */
export const ARTIST_ID_PATTERN = /^(AT|PT)\d{6,}$/;

/** How far out of step a signed request's clock may be before it is refused, in seconds. */
export const SIGNATURE_WINDOW_SECONDS = 300;

export interface PjkConfig {
  baseUrl: string;
  sharedSecret: string;
  publicKey: string;
  webhookSecret: string;
}

/** What PJK answers a code request with. Always this shape, whether or not the ID exists. */
export interface SignInChallenge {
  challengeId: string;
}

/** What PJK answers a correct code with. The token is a JWT signed with PJK's private key. */
export interface SignInResult {
  token: string;
}

/** The claims Phulhaar reads out of that token once it has verified the signature. */
export interface ArtistClaims {
  artistId: string;
  displayName: string;
  standing: 'active' | 'suspended';
  /** Which version of the staff-approved public profile these claims describe. */
  profileVersion: number;
}

export class PjkError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'PjkError';
  }
}

const encoder = new TextEncoder();

/** Lower-case hex, which is what both sides of the contract compare. */
function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(body: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(body)));
}

/**
 * The string both sides sign.
 *
 * The method and path are in it so a signature captured from one endpoint cannot be replayed
 * against another, and the body is included as a digest rather than in full so the line stays a
 * fixed length whatever is being sent. The timestamp is what makes a captured signature expire.
 */
export function signingPayload({
  timestamp,
  method,
  path,
  bodyDigest,
}: {
  timestamp: number;
  method: string;
  path: string;
  bodyDigest: string;
}): string {
  return `v1.${timestamp}.${method.toUpperCase()}.${path}.${bodyDigest}`;
}

export async function signPayload(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );

  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

/**
 * Compare two hex signatures without leaking, through how long the comparison took, how much of
 * the signature was correct. A plain `===` on strings returns as soon as it finds a difference,
 * which is enough to recover a signature one character at a time.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let i = 0; i < a.length; i += 1) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return difference === 0;
}

/**
 * Verify a signed request that arrived here -- PJK's lifecycle webhooks.
 *
 * The clock check is what stops a replay: an attacker who captures a valid webhook can resend it,
 * and without an expiry it would be accepted for ever. Five minutes is loose enough for ordinary
 * clock drift between two hosts and tight enough to be worth having.
 */
export async function verifySignedRequest({
  secret,
  signature,
  timestamp,
  method,
  path,
  body,
  now = Math.floor(Date.now() / 1000),
}: {
  secret: string;
  signature: string;
  timestamp: number;
  method: string;
  path: string;
  body: string;
  now?: number;
}): Promise<boolean> {
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(now - timestamp) > SIGNATURE_WINDOW_SECONDS) return false;

  const expected = await signPayload(
    secret,
    signingPayload({timestamp, method, path, bodyDigest: await sha256Hex(body)}),
  );

  return constantTimeEqual(signature, expected);
}

/** The headers a request to PJK carries. */
export async function signedHeaders({
  config,
  method,
  path,
  body,
  now = Math.floor(Date.now() / 1000),
}: {
  config: Pick<PjkConfig, 'sharedSecret'>;
  method: string;
  path: string;
  body: string;
  now?: number;
}): Promise<Record<string, string>> {
  const signature = await signPayload(
    config.sharedSecret,
    signingPayload({timestamp: now, method, path, bodyDigest: await sha256Hex(body)}),
  );

  return {
    'content-type': 'application/json',
    'x-phulhaar-timestamp': String(now),
    'x-phulhaar-signature': signature,
  };
}

async function postToPjk<T>(config: PjkConfig, path: string, payload: unknown): Promise<T> {
  const body = JSON.stringify(payload);
  const headers = await signedHeaders({config, method: 'POST', path, body});

  const response = await fetch(new URL(path, config.baseUrl), {method: 'POST', headers, body});

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {code?: string} | null;
    throw new PjkError(`PJK refused ${path} with ${response.status}`, response.status, detail?.code);
  }

  return (await response.json()) as T;
}

/**
 * Ask PJK to email a one-time code to the artist who owns this ID.
 *
 * PJK answers with a challenge id whether or not the ID exists, so this endpoint cannot be used to
 * discover which Artist IDs are real. That is why there is no "unknown artist" case to handle
 * here: the next step simply never accepts a code.
 */
export async function requestSignInCode(
  config: PjkConfig,
  artistId: string,
): Promise<SignInChallenge> {
  if (!ARTIST_ID_PATTERN.test(artistId)) {
    // Refused here rather than at PJK, so an obviously malformed ID costs no request and cannot
    // be used to burn through PJK's rate limit on someone else's behalf.
    throw new PjkError('That is not an Artist ID', 400, 'malformed_artist_id');
  }

  return postToPjk<SignInChallenge>(config, '/next/phulhaar/sign-in/request', {artistId});
}

/** Hand PJK the code the artist typed, and get back a signed token describing them. */
export async function verifySignInCode(
  config: PjkConfig,
  {challengeId, code}: {challengeId: string; code: string},
): Promise<SignInResult> {
  return postToPjk<SignInResult>(config, '/next/phulhaar/sign-in/verify', {challengeId, code});
}
