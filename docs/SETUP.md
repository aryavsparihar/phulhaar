# Setting up, step by step

From a fresh clone to a running site. The first part needs nothing from Shopify at all.

## What you need

- **Node 22 or 24.** `node --version`.
- **pnpm**, the version in `package.json` under `packageManager`. `corepack enable` is enough.
- **git**, and a GitHub account with access to this repository.

Nothing else, and no Shopify account, for everything in part 1.

## 1. Run it with no store

```bash
pnpm install
```

```bash
cp .env.example .env
```

Open `.env` and set one value:

```bash
SESSION_SECRET="$(openssl rand -base64 48)"
```

Leave `PUBLIC_STORE_DOMAIN="mock.shop"`. That is Shopify's own hosted mock storefront: it serves
real-shaped product data over the Storefront API and needs no account.

```bash
pnpm dev
```

The site is on `http://localhost:3000`. The products are Shopify's demo ones, not artworks, until
part 3.

### Check your copy is sound

```bash
pnpm lint && pnpm typecheck && pnpm test
```

All of it should pass on a fresh clone. If it does not, that is a bug worth reporting, not
something you have done wrong.

### The artist studio, locally

Artist sign-in talks to PJK, which has not built its side yet, so run the stand-in. In a second
terminal:

```bash
pnpm mock:pjk
```

It listens on `http://localhost:4010`, and `PJK_BASE_URL` in `.env.example` already points at it.
Sign in as `AT000123`; the code is **printed in the mock's terminal** rather than emailed. The four
artists it knows are listed in `docs/PJK-INTEGRATION.md`.

### The browser tests

```bash
pnpm exec playwright install chromium   # once
pnpm mock:pjk                            # in another terminal
pnpm test:e2e
```

Playwright starts the app itself against `.env.e2e`, which is committed and holds only throwaway
values.

## 2. A Shopify development store

Free, and it is where the real catalogue gets built.

1. Create a **Shopify Partner account** at
   [partners.shopify.com](https://partners.shopify.com). Free.
2. **Stores → Add store → Create development store.** Call it something like
   `phulhaar-dev`. Choose **"Create a store to test and build"**.
3. Set the store's currency to **INR** and its address to India. Currency is awkward to change
   later.
4. Note the `*.myshopify.com` domain. That is `PUBLIC_STORE_DOMAIN`.

### The Storefront API token

**Settings → Apps and sales channels → Develop apps → Create an app.** Name it
`phulhaar-storefront`.

Under **Configuration → Storefront API**, grant read access to products, collections, metaobjects,
inventory, and the cart and checkout scopes. Install it, then copy the **Storefront API access
token**.

### The Admin API token

The same custom app, or a second one called `phulhaar-admin`. Under **Configuration → Admin API**,
grant exactly:

```
read_products, write_products,
read_files, write_files,
read_metaobjects, write_metaobjects,
read_metaobject_definitions, write_metaobject_definitions,
read_inventory, write_inventory,
read_locations,
read_publications, write_publications,
read_orders
```

Nothing else. The `/admin` panel uses this token for every create, edit and delete of artworks,
artists and gallery settings; `read_locations` lets it set an original's stock to one, and the
publications scopes publish a work to the Online Store when it goes live. `pnpm shopify:setup`
creates the metaobject and metafield definitions themselves, which is what the two
`*_metaobject_definitions` scopes are for. After changing the definitions, run `pnpm shopify:setup`
again, which also creates the `phulhaar_gallery` settings entry. The reasoning for each is in
`docs/ARCHITECTURE.md`.

Install it and copy the **Admin API access token**. It begins `shpat_`.

> This token can create and publish products. It is the most dangerous value in the project.

### Getting the tokens into `.env` without them passing through anything

Paste the token into the prompt; `read -s` does not echo it, and the `space` before the command
keeps it out of your shell history if `HISTCONTROL=ignorespace` is set.

```bash
 read -rs -p "Admin API token: " T && printf 'PRIVATE_ADMIN_API_TOKEN="%s"\n' "$T" >> .env && unset T
```

```bash
 read -rs -p "Storefront API token: " T && printf 'PUBLIC_STOREFRONT_API_TOKEN="%s"\n' "$T" >> .env && unset T
```

Then set `PUBLIC_STORE_DOMAIN` in `.env` to your `*.myshopify.com` domain.

**Never paste a token into a chat window, an issue, a commit or a screenshot.** If one is ever
exposed, delete the custom app in the Shopify admin — that revokes the token immediately — and
make a new one.

## 3. Create the store's schema

```bash
pnpm shopify:setup --dry-run
```

This makes no network call. It prints the 40 definitions it would create, which is a cheap way to
see that your copy is intact.

Then, against the development store:

```bash
pnpm shopify:setup
```

It is idempotent: run it as often as you like. It creates every metaobject definition, seeds every
taxonomy, and creates every product metafield definition. It **never deletes anything** — a
definition the repository does not know about is reported and left for a person to look at,
because deleting one takes every value stored under it with it.

### Then turn the filters on by hand

The Admin API cannot do this part.

1. Install the free **Search & Discovery** app from the Shopify App Store.
2. **Filters → Add filter**, once for each of the sixteen fields listed in `docs/DATA-MODEL.md`.
3. For **Dominant colour**, choose the swatch presentation.

A store may have **25 filters in total** including Shopify's own, so there is room for about seven
more than we use. Adding one later means giving one up.

## 4. Deploy to Oxygen

Oxygen is included at no extra charge, and development stores can deploy to it — the URL just
needs a store login, which is what we want while the audience is us.

```bash
pnpm exec shopify hydrogen link      # once, pick the store
pnpm exec shopify hydrogen deploy
```

`shopify hydrogen env pull` will write the store's environment variables into `.env` for you, once
they are set in the Hydrogen channel in the admin.

### At launch

- Move to the **Basic** plan: ₹1,499 a month billed annually, plus GST. `docs/DECISIONS.md` has the
  arithmetic, including what a ₹10,000 sale actually costs.
- Connect **phulhaargallery.com**, with DNS at Cloudflare.
- Choose and connect a payment gateway — Razorpay, PayU or Cashfree. Shopify Payments is not
  available in India.
- Work through `docs/REPOSITORY-SETTINGS.md`.

## Secrets in CI and on the host

CI needs no secrets: everything runs against the mocks. When a deployment token is needed:

```bash
 read -rs -p "Oxygen deployment token: " T && gh secret set SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN --body "$T" && unset T
```

Runtime environment variables for the deployed site are set in the Shopify admin under the
Hydrogen sales channel, not in this repository.

## Troubleshooting

**`The environment is not usable`** — exactly what it says, with the names of the missing
variables. `pnpm check:env` tells you whether `.env.example` and the code agree.

**`ERR_PNPM_IGNORED_BUILDS`** — a dependency wants to run an install script and is not approved.
Each approval is deliberate; add it to `allowBuilds` in `pnpm-workspace.yaml` **with the reason**,
having looked at what the script does.

**`within the minimumReleaseAge cutoff`** — a package published in the last week. That is the
supply-chain policy working. Either wait, or pick an older version; do not relax the policy for
convenience.

**`Shopify answered 401`** from the setup script — the Admin API token is wrong, or the custom app
was not installed after its scopes were set.

**Artist sign-in does nothing** — the mock PJK is not running, or `PJK_SHARED_SECRET` differs
between `.env` and the mock. The mock prints `signature does not match` when they disagree.

**Playwright times out waiting for the server** — Hydrogen reads its environment from a file, not
from the process that started it. The suite passes `--env-file .env.e2e`; if you are running the
dev server by hand, it reads `.env`.
