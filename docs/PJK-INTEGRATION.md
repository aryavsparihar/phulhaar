# The contract between Phulhaar and PJK

**None of these endpoints exists yet.** This page is the specification PJK's side will be built
from, in the PJK repository. Phulhaar's half is implemented in `app/lib/pjk.server.ts`, and
`mocks/pjk/server.ts` is a working stand-in that follows this contract closely enough to develop
and test against.

If the two repositories ever disagree about any of this, **this page is the contract** and both
sides are wrong until they match it again.

## What the arrangement is for

PJK knows who an artist is. It holds their email address, their PAN and Aadhaar, their bank
details and their identity documents, and it has already built the application, the identity
checks, the staff approval and the deletion-on-request that go with holding them.

Phulhaar sells things. It needs to know that the person signing in is a particular approved
artist, and it needs a display name to put on a page. **It does not need, and must never hold, any
of the rest.** Every design choice below follows from that.

So: PJK is the identity provider. Phulhaar asks it a question, gets a signed answer, and keeps
nothing but its own session.

## Terms

| Term                | Meaning                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Artist ID**       | `AT000123`. Matches `^(AT                                                                    | PT)\d{6,}$`. `PT` is a partner. |
| **Shared secret**   | A secret both sides hold, used to sign requests. Two of them: one for each direction.        |
| **Signing key**     | PJK's RSA private key, which signs the artist token. Phulhaar only ever has the public half. |
| **Challenge**       | One attempt at signing in. Identified by a `challengeId`.                                    |
| **Profile version** | An integer that increases every time staff approve a change to an artist's public profile.   |

## Signing

Every request in either direction is signed. The scheme is the same both ways; only the secret
differs.

### Headers

| Header                 | Value                                           |
| ---------------------- | ----------------------------------------------- |
| `x-phulhaar-timestamp` | Unix seconds, when the request was signed       |
| `x-phulhaar-signature` | Lower-case hex HMAC-SHA256 of the signed string |
| `content-type`         | `application/json`                              |

PJK's webhooks to Phulhaar use the same two header names, signed with the webhook secret.

### The signed string

```
v1.<timestamp>.<METHOD>.<path>.<sha256-hex-of-body>
```

For example:

```
v1.1762000000.POST./next/phulhaar/sign-in/request.9f86d081884c7d65...
```

- `v1` is a version prefix, so the scheme can change without ambiguity.
- `<METHOD>` is upper case, always, so the two sides cannot disagree over casing.
- `<path>` is the path only — no scheme, host or query string.
- The body is included as a **SHA-256 hex digest**, not in full, so the signed string is a fixed
  length whatever is sent. An empty body digests the empty string.

### The rules both sides must follow

1. **Refuse a timestamp more than 300 seconds from now**, in either direction. This is what makes a
   captured request expire. Without it, anyone who recorded one valid request could replay it for
   ever.
2. **Compare signatures in constant time.** A plain string comparison returns as soon as it finds
   a difference, which is enough to recover a signature one character at a time.
3. **Sign and verify the exact bytes of the body**, before any parsing or re-serialising. JSON
   round-tripping changes key order and whitespace and will break the digest.
4. **Refuse any request whose signature is absent or malformed**, with 401 and no detail about why.

### Key rotation

Both shared secrets must be rotatable without downtime:

- **Verification accepts a list of secrets.** During a rotation both the old and the new are
  accepted.
- **Signing always uses the first.**
- The window should be hours, not weeks, and the old secret is removed once both sides confirm
  nothing is still using it.
- The **RSA signing key** rotates through the JWKS endpoint: PJK publishes both keys, Phulhaar
  selects by the token's `kid`, and the old key is withdrawn once no token signed with it can still
  be valid (two minutes, given the token lifetime).

## 1. Request a code

```
POST https://pjk.co.in/next/phulhaar/sign-in/request
```

```json
{"artistId": "AT000123"}
```

**Response, always 200:**

```json
{"challengeId": "c2f8e1a4-5b6c-4d7e-8f90-1a2b3c4d5e6f"}
```

### What PJK does

- If the ID belongs to an **approved, active** artist: email them a one-time code, using PJK's
  existing code system, rate limits and security log.
- If it does not — unknown, never approved, deleted, or malformed — **do nothing, and answer
  exactly the same way.**

That second case is the important one. **The response must not reveal whether an Artist ID
exists**, which is why there is no 404 here, why the body is identical, and why the two paths
should take indistinguishable time. Otherwise this endpoint becomes a way to enumerate which IDs
are real, and Artist IDs are sequential.

Phulhaar refuses a malformed ID itself, before sending anything, so a typo cannot be used to burn
through PJK's rate limit on a real artist's behalf.

### Rate limits

PJK enforces, and returns **429** with `{"code": "rate_limited"}` and a `Retry-After` header:

| Limit                         | Suggested                     |
| ----------------------------- | ----------------------------- |
| Per Artist ID                 | 5 code requests per hour      |
| Per Artist ID                 | 1 code request per 60 seconds |
| Across all IDs, from Phulhaar | 100 per hour                  |

A code is valid for **10 minutes** and for **one** successful use.

## 2. Verify a code

```
POST https://pjk.co.in/next/phulhaar/sign-in/verify
```

```json
{"challengeId": "c2f8e1a4-...", "code": "481920"}
```

**On success, 200:**

```json
{"token": "<base64url header>.<base64url claims>.<base64url signature>"}
```

The three parts are named rather than shown. Please keep it that way: a realistic `eyJ...` string
here, even an invented one, is matched by gitleaks' JWT rule on shape alone and fails the secret
scan for everybody. The claims are written out in full below, which is the part worth reading
anyway.

**On failure**, the status and a stable `code`, with no further detail:

| Status | `code`              | Means                                                        |
| ------ | ------------------- | ------------------------------------------------------------ |
| 400    | `bad_code`          | Wrong code, or a challenge with no real artist behind it     |
| 400    | `challenge_expired` | Unknown, used or older than 10 minutes                       |
| 429    | `too_many_attempts` | More than 5 attempts; the challenge is destroyed             |
| 403    | `suspended`         | The artist exists and is approved but is currently suspended |
| 401    | `bad_signature`     | The request's own signature did not verify                   |

**Five attempts, then the challenge is destroyed** rather than counted further, so a six-digit code
cannot be brute-forced. The artist starts again.

### The token

An **RS256 JWT**, signed with PJK's private key, which Phulhaar verifies with the public key from
PJK's JWKS endpoint.

```json
{
  "iss": "https://pjk.co.in",
  "aud": "phulhaar",
  "iat": 1762000000,
  "exp": 1762000120,
  "jti": "a3f1...",
  "artistId": "AT000123",
  "displayName": "Sita Devi",
  "standing": "active",
  "profileVersion": 3
}
```

- **`exp` is two minutes.** Phulhaar exchanges the token for its own session cookie immediately and
  never stores it, so it only has to survive one round trip. A long-lived token would be a bearer
  credential worth stealing.
- **`jti`** is there so Phulhaar can refuse a token it has already accepted.
- **`displayName` is the only personal field.** No email address, ever.
- The token must carry **nothing from KYC**. If a claim is added to it later that contains an email
  address, a phone number or anything from an identity document, that is a breach of this contract.

Phulhaar must check: the signature, `iss`, `aud`, `exp`, `iat` not in the future, and that
`artistId` matches the ID the sign-in began with.

### JWKS

```
GET https://pjk.co.in/.well-known/phulhaar-jwks.json
```

Standard JWKS. Phulhaar caches it, selects by `kid`, and refetches once if a `kid` is unknown —
which is what makes rotation invisible.

## 3. Lifecycle webhooks

PJK calls Phulhaar when something changes about an artist. Without these, a suspended artist's
works would stay on sale until they next tried to sign in.

```
POST https://phulhaargallery.com/webhooks/pjk/artist
```

Signed with **`PJK_WEBHOOK_SECRET`**, which is a different secret from the one above, so a leak of
either does not let someone speak in both directions.

```json
{
  "event": "approved",
  "artistId": "AT000123",
  "profileVersion": 3,
  "occurredAt": "2026-11-08T09:15:00Z",
  "publicProfile": {
    "displayName": "Sita Devi",
    "biography": "...",
    "statement": "...",
    "city": "Madhubani",
    "state": "Bihar",
    "mediums": ["natural-pigments", "ink"],
    "traditions": ["madhubani"],
    "exhibitions": ["..."],
    "links": ["https://..."],
    "portraitUrl": "https://pjk.co.in/media/..."
  }
}
```

| `event`           | What Phulhaar does                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `approved`        | Create or update the `phulhaar_artist` metaobject. Set `pjk_verified` true.                                                        |
| `profile_updated` | Update the metaobject from `publicProfile`.                                                                                        |
| `suspended`       | Set `standing` to `suspended` and **hide every one of that artist's works** — unpublish, do not delete.                            |
| `reinstated`      | Set `standing` to `active`. Works return to the status they had.                                                                   |
| `deleted`         | Remove the profile and the works, keeping **only** what the law requires us to keep about completed orders. See `docs/PRIVACY.md`. |

`publicProfile` is present on `approved` and `profile_updated`, and omitted on the rest.

**Response:** `200 {"ok": true}` once the change is stored. Any other status, or no answer within
10 seconds, means PJK should retry.

### Rules

- **Idempotent.** Retries will happen. Applying the same event twice must be the same as applying
  it once.
- **Out-of-order events are ignored by `profileVersion`.** If the stored version is already equal
  or higher, acknowledge with 200 and change nothing. Networks reorder; the gallery must not end up
  showing an older approved profile than PJK has.
- **`suspended` and `deleted` are never ignored on version grounds.** Hiding someone's work late is
  bad; failing to hide it is worse.
- **Retries:** at least 5, with exponential backoff over about an hour, then an alert to staff.
- **`portraitUrl` must be fetchable by Phulhaar's server** for long enough to copy the image into
  Shopify's CDN. A short-lived signed URL is fine; it must not require PJK credentials.

### Deletion

`deleted` is the only destructive event, and the only one that cannot be undone, so it is worth
being exact:

1. Delete the `phulhaar_artist` metaobject and the portrait from the CDN.
2. Delete every artwork of theirs **that has never been ordered**, images included.
3. For a work that has been ordered, delete the images, the description and the artist's note;
   keep the product, with the artist reference replaced by the Artist ID as plain text, because
   the order it belongs to has to stay intelligible.
4. Never touch the order records themselves.
5. Answer 200 with what was done, so PJK's own deletion log can record it:
   `{"ok": true, "deleted": {"artworks": 12, "retainedForOrders": 3}}`

## 4. Sales, for payouts

**Payouts are made by PJK**, which holds the bank details. Phulhaar tells it what was sold.

```
POST https://pjk.co.in/next/phulhaar/sales
```

```json
{
  "orderId": "gid://shopify/Order/123",
  "soldAt": "2026-11-20T10:00:00Z",
  "artistId": "AT000123",
  "artworkHandle": "sita-devi-monsoon-garden-2025",
  "artworkTitle": "Monsoon Garden",
  "grossInr": 1000000,
  "commissionInr": 300000,
  "artistShareInr": 700000
}
```

- **Amounts are integer paise**, never floating point. A rupee value in a float will eventually be
  wrong by a paisa, and this is money somebody is owed.
- **Idempotent on `orderId` plus `artworkHandle`**, so a retry cannot pay an artist twice. PJK
  answers 200 for an already-recorded sale.
- The commission rate is **not settled yet** (`docs/DECISIONS.md`, section 5), so the fields are
  specified but the numbers in them are not final.
- No buyer details are sent. PJK does not need to know who bought it, so it is not told.

This is the one part of the contract where a staff-exported spreadsheet would do to begin with, and
that may well be the right thing for the first few sales.

## Phulhaar's own session

Once a token has verified:

- A cookie: **HttpOnly, Secure, SameSite=Lax, Path=/, 30 days**, signed with `SESSION_SECRET`.
- It holds the **Artist ID, the profile version and an issued-at time. Nothing else** — no name,
  no token, nothing from PJK.
- Rotated on sign-in, and on every privilege change.
- Every studio request re-checks the Artist ID against the work being touched. **An artist can
  only ever reach their own works**, and that check is per request, not per session.
- A cookie cannot be revoked before it expires. If suspending an artist must sign them out
  immediately rather than at their next request, that needs server-side sessions and therefore a
  database — the argument for one is in `docs/DECISIONS.md`, section 4.

## The alternative we were asked to weigh

The brief asks for Artist ID plus code typed on Phulhaar, and also asks for the trade-offs against
a redirect flow — "Sign in with PJK", OAuth 2 authorisation code with PKCE, where the artist types
the code on `pjk.co.in` and comes back with an authorisation code.

**For the redirect flow:**

- **Phulhaar never handles the code at all.** It cannot leak, log or mistreat it, and the
  brute-force surface moves entirely to PJK, which already has rate limits and a security log for
  exactly this.
- One place for artists to learn to sign in, and one place to add anything later — a passkey, a
  second factor — with no change here.
- It is a standard. The libraries exist, and so does everyone else's experience of getting it
  wrong.
- A phishing page imitating Phulhaar's code box is useless, because the real code box is on a
  domain the artist can check.

**For typing the code on Phulhaar, as asked:**

- **Less to build on PJK's side right now**, which matters because PJK has not built any of this
  and the website is wanted as soon as possible. Two signed endpoints is a smaller job than an
  authorisation server.
- The artist stays on `phulhaargallery.com`, which is a slightly kinder first experience for
  someone who may not know that PJK and Phulhaar are the same organisation.
- No redirect, so no return URLs to validate — an open redirect is its own class of bug.

**Recommendation: build it as asked, and keep the door open.** The two signed endpoints are
genuinely less work, the launch is wanted soon, and the code-handling risk is contained because
Phulhaar never stores the code, never logs it, and swaps it for a two-minute token. But put the
sign-in behind one module — `app/lib/pjk.server.ts` — so that moving to a redirect flow later
changes that module and two routes, not the studio.

**Whichever is chosen, the protections above are not optional:** identical answers for unknown
IDs, five attempts then destroy the challenge, ten-minute codes, two-minute tokens, and a session
cookie that holds nothing but an Artist ID.

## Developing against the mock

```bash
pnpm mock:pjk
```

It listens on `http://localhost:4010`, generates a throwaway RSA key pair at start-up and
publishes it at `/.well-known/jwks.json`. It knows four invented artists:

| Artist ID  | Name                 | Standing      |
| ---------- | -------------------- | ------------- |
| `AT000123` | Sita Devi            | active        |
| `AT000124` | Ramesh Pattnaik      | active        |
| `AT000125` | Anjali Rao           | **suspended** |
| `PT000001` | Chitrashala Partners | active        |

Codes are **printed to its terminal** instead of emailed. That is the one place it deliberately
differs from the real thing. It checks the signature and the clock exactly as PJK must, because a
mock more forgiving than production lets a broken client pass locally and fail on the day it
matters.

## For whoever builds the PJK side

A checklist, so nothing above gets lost in the prose:

- [ ] `POST /next/phulhaar/sign-in/request` — always 200, always `{challengeId}`, indistinguishable
      for unknown IDs
- [ ] `POST /next/phulhaar/sign-in/verify` — RS256 token, 2-minute expiry, 5 attempts then destroy
- [ ] `GET /.well-known/phulhaar-jwks.json` — JWKS with `kid`
- [ ] `POST /next/phulhaar/sales` — idempotent on order plus artwork, paise as integers
- [ ] Webhooks to Phulhaar for approved, profile_updated, suspended, reinstated, deleted
- [ ] HMAC verification with a 300-second window and a constant-time comparison
- [ ] A list of accepted shared secrets, so rotation needs no downtime
- [ ] Rate limits as above, 429 with `Retry-After`
- [ ] Every sign-in attempt in PJK's existing security log
- [ ] Two secrets, one per direction, and neither ever logged
