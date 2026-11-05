/**
 * Artist sign-in: turning PJK's signed token into Phulhaar's own session.
 *
 * The flow is in docs/PJK-INTEGRATION.md. PJK returns an RS256 JWT after the artist types the
 * code; this file checks that token — signature, issuer, audience, expiry, standing — and then
 * keeps only the Artist ID and display name in the session cookie. The token itself is never
 * stored.
 *
 * The key comes from PJK_PUBLIC_KEY (PEM) when it is set, otherwise from PJK's JWKS at
 * `${PJK_BASE_URL}/.well-known/jwks.json`. The mock PJK generates a fresh key every start, so
 * locally the JWKS route is the one that works.
 */
import type {HydrogenSession} from '@shopify/hydrogen';
import type {PhulhaarEnv} from '~/lib/env.server';
import {PjkError, type ArtistClaims, type PjkConfig} from '~/lib/pjk.server';

export const ARTIST_KEY = 'artist';
export const CHALLENGE_KEY = 'pjkChallenge';

export interface SignedInArtist {
  artistId: string;
  displayName: string;
  signedInAt: number;
}

export interface PendingChallenge {
  challengeId: string;
  artistId: string;
  expiresAt: number;
}

/** What sign-in needs. The webhook secret is for the lifecycle webhooks, not for this. */
export function signInConfig(env: PhulhaarEnv): PjkConfig {
  if (!env.PJK_BASE_URL || !env.PJK_SHARED_SECRET) {
    throw new PjkError(
      'Artist sign-in needs PJK_BASE_URL and PJK_SHARED_SECRET. See docs/PJK-INTEGRATION.md.',
      503,
      'not_configured',
    );
  }
  return {
    baseUrl: env.PJK_BASE_URL,
    sharedSecret: env.PJK_SHARED_SECRET,
    publicKey: env.PJK_PUBLIC_KEY ?? '',
    webhookSecret: env.PJK_WEBHOOK_SECRET ?? '',
  };
}

export function currentArtist(session: HydrogenSession): SignedInArtist | null {
  const value = session.get(ARTIST_KEY) as SignedInArtist | undefined;
  return value?.artistId ? value : null;
}

const SESSION_DAYS = 30;

export function isExpired(artist: SignedInArtist) {
  return Date.now() - artist.signedInAt > SESSION_DAYS * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------------------------

function base64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJson<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(base64urlToBytes(part))) as T;
}

const RS256 = {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'} as const;

async function keyFromPem(pem: string) {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  return crypto.subtle.importKey('spki', base64urlToBytes(body), RS256, false, [
    'verify',
  ]);
}

async function keyFromJwks(baseUrl: string, kid: string | undefined) {
  const response = await fetch(new URL('/.well-known/jwks.json', baseUrl));
  if (!response.ok)
    throw new PjkError('Could not fetch PJK’s keys', 502, 'jwks_unavailable');
  const {keys} = (await response.json()) as {
    keys: Array<JsonWebKey & {kid?: string}>;
  };
  const jwk =
    keys.find((key) => key.kid === kid) ?? (kid ? undefined : keys[0]);
  if (!jwk)
    throw new PjkError('PJK’s token names an unknown key', 401, 'unknown_key');
  return crypto.subtle.importKey('jwk', jwk, RS256, false, ['verify']);
}

/** Verify PJK's token and return the artist it describes, or throw. */
export async function verifyArtistToken(
  token: string,
  config: PjkConfig,
): Promise<ArtistClaims> {
  const parts = token.split('.');
  if (parts.length !== 3)
    throw new PjkError('Malformed token', 401, 'bad_token');
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = decodeJson<{alg?: string; kid?: string}>(headerPart);
  if (header.alg !== 'RS256')
    throw new PjkError('Unexpected token algorithm', 401, 'bad_token');

  const key = config.publicKey
    ? await keyFromPem(config.publicKey)
    : await keyFromJwks(config.baseUrl, header.kid);

  const valid = await crypto.subtle.verify(
    RS256,
    key,
    base64urlToBytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );
  if (!valid)
    throw new PjkError('Token signature does not verify', 401, 'bad_signature');

  const claims = decodeJson<
    ArtistClaims & {iss?: string; aud?: string | string[]; exp?: number}
  >(payloadPart);
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

  if (claims.iss !== 'https://pjk.co.in')
    throw new PjkError('Wrong issuer', 401, 'bad_token');
  if (!audiences.includes('phulhaar'))
    throw new PjkError('Wrong audience', 401, 'bad_token');
  if (!claims.exp || claims.exp < now)
    throw new PjkError('Token expired', 401, 'expired');
  if (claims.standing !== 'active') {
    throw new PjkError('This artist is not active on PJK', 403, 'suspended');
  }

  return claims;
}

/** Plain-English messages for the codes PJK and this file use. */
export function messageFor(error: unknown): string {
  const code = error instanceof PjkError ? error.code : undefined;
  switch (code) {
    case 'malformed_artist_id':
      return 'That does not look like an Artist ID. It starts with AT or PT, followed by six digits.';
    case 'bad_code':
      return 'That code is not right. Check the email from PJK and try again.';
    case 'challenge_expired':
      return 'That code has expired. Ask for a new one.';
    case 'too_many_attempts':
      return 'Too many tries. Ask for a new code.';
    case 'suspended':
      return 'Your PJK account is not active at the moment. Please contact PAT and J.K. Co.';
    case 'not_configured':
      return 'Artist sign-in is not switched on yet. Please try again later.';
    default:
      return 'We could not reach PJK just now. Please try again in a minute.';
  }
}
