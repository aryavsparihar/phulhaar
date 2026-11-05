import {describe, expect, it} from 'vitest';
import {
  ARTIST_ID_PATTERN,
  constantTimeEqual,
  PjkError,
  requestSignInCode,
  signPayload,
  signedHeaders,
  signingPayload,
  verifySignedRequest,
} from '~/lib/pjk.server';

const secret = 'a-shared-secret-for-tests-only-000000';

const config = {
  baseUrl: 'http://localhost:4010',
  sharedSecret: secret,
  publicKey: '',
  webhookSecret: secret,
};

describe('ARTIST_ID_PATTERN', () => {
  it('accepts the IDs PJK issues', () => {
    expect(ARTIST_ID_PATTERN.test('AT000123')).toBe(true);
    expect(ARTIST_ID_PATTERN.test('PT000123')).toBe(true);
    expect(ARTIST_ID_PATTERN.test('AT1234567')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(ARTIST_ID_PATTERN.test('AT123')).toBe(false); // too few digits
    expect(ARTIST_ID_PATTERN.test('at000123')).toBe(false); // lower case
    expect(ARTIST_ID_PATTERN.test('XX000123')).toBe(false); // not a known prefix
    expect(ARTIST_ID_PATTERN.test('AT000123 ')).toBe(false); // trailing space
    expect(ARTIST_ID_PATTERN.test("AT000123' OR 1=1")).toBe(false);
  });
});

describe('signingPayload', () => {
  it('binds the signature to the method and the path', async () => {
    const digest = 'abc';
    const base = {timestamp: 1_700_000_000, bodyDigest: digest};

    const request = signingPayload({
      ...base,
      method: 'POST',
      path: '/sign-in/request',
    });
    const verify = signingPayload({
      ...base,
      method: 'POST',
      path: '/sign-in/verify',
    });
    const asGet = signingPayload({
      ...base,
      method: 'GET',
      path: '/sign-in/request',
    });

    expect(request).not.toBe(verify);
    expect(request).not.toBe(asGet);
    expect(await signPayload(secret, request)).not.toBe(
      await signPayload(secret, verify),
    );
  });

  it('upper-cases the method, so the two sides cannot disagree over casing', () => {
    expect(
      signingPayload({
        timestamp: 1,
        method: 'post',
        path: '/x',
        bodyDigest: 'd',
      }),
    ).toBe(
      signingPayload({
        timestamp: 1,
        method: 'POST',
        path: '/x',
        bodyDigest: 'd',
      }),
    );
  });
});

describe('constantTimeEqual', () => {
  it('matches identical strings and nothing else', () => {
    expect(constantTimeEqual('abcd', 'abcd')).toBe(true);
    expect(constantTimeEqual('abcd', 'abce')).toBe(false);
    expect(constantTimeEqual('abcd', 'abc')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
  });
});

describe('verifySignedRequest', () => {
  const method = 'POST';
  const path = '/next/phulhaar/webhooks/artist';
  const body = JSON.stringify({artistId: 'AT000123', event: 'approved'});

  async function sign(timestamp: number) {
    const headers = await signedHeaders({
      config: {sharedSecret: secret},
      method,
      path,
      body,
      now: timestamp,
    });
    return headers['x-phulhaar-signature'];
  }

  it('accepts a signature made with the same secret, within the window', async () => {
    const now = 1_700_000_000;
    await expect(
      verifySignedRequest({
        secret,
        signature: await sign(now),
        timestamp: now,
        method,
        path,
        body,
        now,
      }),
    ).resolves.toBe(true);
  });

  it('refuses a signature made with a different secret', async () => {
    const now = 1_700_000_000;
    await expect(
      verifySignedRequest({
        secret: 'a-different-secret-000000000000000000',
        signature: await sign(now),
        timestamp: now,
        method,
        path,
        body,
        now,
      }),
    ).resolves.toBe(false);
  });

  it('refuses a captured request replayed later', async () => {
    const signedAt = 1_700_000_000;
    const signature = await sign(signedAt);

    // Inside the window it is still good.
    await expect(
      verifySignedRequest({
        secret,
        signature,
        timestamp: signedAt,
        method,
        path,
        body,
        now: signedAt + 299,
      }),
    ).resolves.toBe(true);

    // A second past it, it is not.
    await expect(
      verifySignedRequest({
        secret,
        signature,
        timestamp: signedAt,
        method,
        path,
        body,
        now: signedAt + 301,
      }),
    ).resolves.toBe(false);
  });

  it('refuses a request signed in the future by more than the window', async () => {
    const now = 1_700_000_000;
    await expect(
      verifySignedRequest({
        secret,
        signature: await sign(now + 600),
        timestamp: now + 600,
        method,
        path,
        body,
        now,
      }),
    ).resolves.toBe(false);
  });

  it('refuses a body that was changed after it was signed', async () => {
    const now = 1_700_000_000;
    await expect(
      verifySignedRequest({
        secret,
        signature: await sign(now),
        timestamp: now,
        method,
        path,
        body: JSON.stringify({artistId: 'AT000999', event: 'approved'}),
        now,
      }),
    ).resolves.toBe(false);
  });

  it('refuses a timestamp that is not a number at all', async () => {
    const now = 1_700_000_000;
    await expect(
      verifySignedRequest({
        secret,
        signature: await sign(now),
        timestamp: Number.NaN,
        method,
        path,
        body,
        now,
      }),
    ).resolves.toBe(false);
  });
});

describe('requestSignInCode', () => {
  it('refuses a malformed Artist ID without troubling PJK', async () => {
    // No fetch is stubbed, so a request reaching the network would fail differently.
    await expect(requestSignInCode(config, 'not-an-id')).rejects.toThrow(
      PjkError,
    );
    await expect(requestSignInCode(config, 'not-an-id')).rejects.toMatchObject({
      status: 400,
      code: 'malformed_artist_id',
    });
  });
});
