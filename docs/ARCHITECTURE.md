# Architecture

How Phulhaar Gallery is put together, and why. `docs/DECISIONS.md` has the research and the costs
behind the choices; this page is the shape of the thing.

## The shape of it

```
                 buyers                          artists
                   │                                │
                   ▼                                ▼
        ┌──────────────────────────────────────────────────────┐
        │   Hydrogen (React Router) on Shopify Oxygen          │
        │                                                      │
        │   /                 the gallery                       │
        │   /artworks/:handle one work                          │
        │   /artists/:id      one artist                        │
        │   /collections/*    curated and by category           │
        │   /studio/*         the artist studio (signed in)     │
        │   /webhooks/pjk/*   signed, from PJK                  │
        └───────┬──────────────────────┬───────────────────┬────┘
                │                      │                   │
       Storefront API          Admin API              signed HTTPS
       (public, read)      (server only, write)             │
                │                      │                   ▼
                ▼                      ▼            ┌──────────────┐
        ┌────────────────────────────────────┐       │   pjk.co.in  │
        │            Shopify                 │       │              │
        │  products · metafields · metaobjects│      │ identity, KYC│
        │  collections · inventory · orders   │      │ payouts      │
        │  checkout · customers · CDN         │      └──────────────┘
        └────────────────────────────────────┘
                         │
                         ▼
                 third-party gateway
              (Razorpay / PayU / Cashfree)
```

Two systems, one job each. **Shopify is the system of record for the catalogue and for commerce.
PJK is the system of record for who an artist is.** Phulhaar is the thing in the middle that makes
a gallery out of them, and it stores almost nothing of its own.

## The one app

Storefront and studio are one Hydrogen application, deployed to Oxygen. Hydrogen is a React Router
app that runs in `workerd` — the same runtime Cloudflare Workers use — which is why MiniOxygen is
used in development rather than plain Node: the two behave the same, so something that works
locally works deployed.

The practical consequences of the runtime:

- **Node's standard library is mostly absent.** Use Web Crypto, not `node:crypto`; `fetch`, not
  `http`. `app/lib/pjk.server.ts` is written that way on purpose.
- **No filesystem and no long-lived memory.** Anything that has to persist goes to Shopify.
- **The environment arrives as an `Env` object per request**, not in `process.env`, which is why
  `app/lib/env.server.ts` validates it when the request context is built rather than at module
  load.

### Server and client

A `.server.ts` suffix is the boundary that matters. Hydrogen refuses to bundle such a module for
the browser, so the Admin API token and the PJK secrets cannot reach it even by accident. Anything
touching a secret goes in a `.server.ts` file, and the end-to-end suite asserts that no secret's
name appears in a served page.

### The routes

| Route                                                         | Who      | What                                           |
| ------------------------------------------------------------- | -------- | ---------------------------------------------- |
| `/`, `/collections/*`, `/artworks/*`, `/artists/*`, `/search` | anyone   | The catalogue, read through the Storefront API |
| `/cart`, then Shopify checkout                                | anyone   | Shopify's own                                  |
| `/account/*`                                                  | buyers   | Shopify customer accounts, passwordless        |
| `/studio/*`                                                   | artists  | Their own works. Admin API calls happen here   |
| `/webhooks/pjk/*`                                             | PJK only | Signature-checked before anything else         |

## Where state lives

See `docs/DATA-MODEL.md` for every field. In short: an artwork is a product, its details are
metafields, an artist is a metaobject, taxonomies are metaobjects, groupings are collections, and
an original is sold because its inventory reached zero.

**Phulhaar has no database.** The three things that would justify one — rate limiting the studio,
an audit trail for reviews, and sessions that can be revoked — are written up in
`docs/DECISIONS.md`, section 4, so that when one of them arrives the argument is already made and
the answer is a free Postgres tier rather than a shrug.

## The two APIs

**Storefront API** — public, read-only, safe in the browser bundle. Everything a visitor sees.
Queries are typed by `shopify hydrogen codegen`, which writes `storefrontapi.generated.d.ts`.

**Admin API** — server only. The studio and `scripts/shopify-setup.ts`. Least privilege:

| Scope                                   | Why                                                        |
| --------------------------------------- | ---------------------------------------------------------- |
| `write_products`                        | Create and edit artworks, and publish on approval          |
| `read_products`                         | Read a work back                                           |
| `write_files`                           | Attach uploaded images                                     |
| `write_metaobjects`, `read_metaobjects` | Artist profiles and taxonomies                             |
| `read_inventory`, `write_inventory`     | Inventory of 1 on an original                              |
| `read_orders`                           | Tell an artist their work sold, and report the sale to PJK |

**Not** granted: `write_customers`, `write_discounts`, `write_shipping`, anything to do with
payouts or payments. If a feature seems to need one of those, it needs a conversation first.

## Images

Artists' images go **straight from the browser to Shopify**, never through our worker:

1. The studio asks the server for an upload target (`stagedUploadsCreate`).
2. The browser uploads the file to that target.
3. The server attaches the returned `resourceUrl` to the product.

An Oxygen worker is the wrong place to buffer a 40 MB photograph, and this way it never has to.

**There is no minimum image size** — a firm rule in the brief, and a deliberate one: an artist
photographing work on a phone in a village should not be turned away by a pixel count. A maximum
is fine, and the originals are kept, with resized versions served from Shopify's CDN by URL
parameter.

## Artist sign-in

`docs/PJK-INTEGRATION.md` is the contract. The short version: the artist types an Artist ID, PJK
emails a code, the artist types the code, PJK returns a two-minute signed token, and Phulhaar
swaps it for its own 30-day cookie holding nothing but the Artist ID. **Phulhaar never sees an
email address and never stores anything from KYC.**

Every studio request re-checks that the Artist ID in the session owns the work being touched —
per request, not per session.

## Security

The non-negotiables, and where each one actually lives:

|                                                                                          | Where                                                                                                         |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Secrets in server env only                                                               | `app/lib/env.server.ts`, and the `.server.ts` boundary                                                        |
| Signed session cookie, HttpOnly, Secure, SameSite=Lax                                    | `app/lib/session.ts`                                                                                          |
| CSRF protection on every state-changing request                                          | To add with the studio (Phase 5)                                                                              |
| Input validation with zod, server-side, on every field                                   | `app/lib/env.server.ts` now; studio next                                                                      |
| Least-privilege Admin API scopes                                                         | The table above                                                                                               |
| Strict CSP with nonces, HSTS, Referrer-Policy, Permissions-Policy                        | To add in Phase 2; `assetsInlineLimit: 0` is already set in `vite.config.ts` so that a strict CSP is possible |
| CI fails on high and critical advisories in what ships, on secrets, and on code findings | `.github/workflows/security.yml`, and "Dependency advisories" below                                           |
| Repository settings: ruleset, secret scanning, Dependabot                                | `docs/REPOSITORY-SETTINGS.md`                                                                                 |

### Dependency advisories, and why the gate is scoped to production

The blocking check is `pnpm audit --prod --audit-level high`. That is narrower than the brief
asked for, and the narrowing is deliberate.

Every advisory currently outstanding is a transitive dependency of a **development tool**: the
local dev server (`@shopify/mini-oxygen`, which bundles miniflare) and the codegen tool. None of
it is in the deployed worker, and we cannot fix any of it from here — Shopify has to update its
own tooling. The only ways to make an unscoped check green would be to force patched versions
several majors up through a worker-runtime emulator, or to ignore the findings with an expiry date
and keep renewing it. The first risks a dev server that breaks in ways nobody can explain; the
second is a lie with a calendar reminder attached.

A permanently red required check gets switched off, and then nothing is watched at all. So:

- **`pnpm audit --prod` blocks.** If it fails, something that reaches a buyer is affected.
- **The full audit is reported** on the run summary, where the list stays visible and should
  shrink as Shopify updates its packages.
- **Overrides fix what can be fixed safely**, in `pnpm-workspace.yaml`, and only within the same
  major version.
- **Trivy blocks on secrets and misconfiguration** but only reports dependency findings, because
  it reads the lockfile and cannot tell a development dependency from one that ships. pnpm can, so
  pnpm decides.

Worth rechecking whenever Shopify releases a new `@shopify/mini-oxygen`.

### Hydrogen stays on the 2026.4 line, for now

`@shopify/hydrogen` is pinned to `~2026.4.0`, with a tilde rather than a caret on purpose: a caret
resolves to 2026.10, and **2026.10 is a breaking change**. It removes `hydrogen()` from
`@shopify/hydrogen/vite` and the `shopify hydrogen build` command, and needs Shopify's
[migration guide](https://shopify.dev/docs/storefronts/hydrogen/migrate) followed properly.

That migration is worth doing — it is the current line and where the fixes will land — but it is a
piece of work in its own right, not something to slip into a set-up branch. Until then the tilde
keeps us on a line the app actually runs on.

Things that are true now and should stay true:

- **No self-hosted runner, ever.** The repository is public.
- **Nothing secret or personal in the repository.** The two committed env files hold only
  throwaway values.
- **Both PJK secrets are separate**, one per direction.

## Backups

A nightly GitHub Actions job exports the whole catalogue — products, metafields, metaobjects,
collections — as JSON, encrypts it with `age`, and puts it in Google Drive with `rclone`. The same
pattern PJK uses. Shopify holds the live data; this is the answer to a mistaken bulk edit, and to
the question of what happens if the store becomes unreachable.

**Not built yet.** It belongs with the first real catalogue data, in Phase 2.

## Checks before pushing

What CI runs, in the order it runs them:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm check:env
pnpm test
pnpm shopify:setup --dry-run
pnpm build
pnpm test:e2e          # needs pnpm mock:pjk running
```

None of them needs a credential. The storefront builds against Shopify's hosted `mock.shop` and
the browser tests run against that and the mock PJK, so the whole suite passes on a fork's pull
request and on a laptop where nobody has set a store up.
