# Phulhaar Gallery

The official website of **Phulhaar Gallery by PAT and J.K. Co.** — an online gallery for Indian
artists, and the studio where those artists manage their own work.

The physical gallery opens on **8 November 2026**.

## What this is

One [Hydrogen](https://shopify.dev/docs/storefronts/headless/hydrogen) application, deployed to
Shopify Oxygen, doing two jobs:

- **The storefront.** A catalogue of original work — paintings, drawings, sculpture, textile, and
  the named Indian traditions the gallery exists to show properly: Madhubani, Pichwai, Gond, Warli,
  Pattachitra and the rest. Browsing, filtering, artwork and artist pages, and checkout through
  Shopify.
- **The artist studio.** Artists approved on [pjk.co.in](https://pjk.co.in) sign in with their
  Artist ID and a one-time code, upload their work, and manage it. Staff review each work before it
  goes live.

Shopify is the system of record for the catalogue and for commerce. **PJK is the system of record
for who an artist is**, and this site is built so that it cannot hold identity data: no email
addresses, no PAN, no Aadhaar, no bank details. See [docs/PRIVACY.md](docs/PRIVACY.md).

## Getting started

It runs with no Shopify account at all, against Shopify's hosted mock storefront:

```bash
pnpm install
```

```bash
cp .env.example .env && printf 'SESSION_SECRET="%s"\n' "$(openssl rand -base64 48)" >> .env
```

```bash
pnpm dev
```

For artist sign-in, run the stand-in for PJK in a second terminal — PJK has not built its side yet:

```bash
pnpm mock:pjk
```

[docs/SETUP.md](docs/SETUP.md) has the rest: a development store, the API tokens, creating the
store's schema, and deploying.

## The documents

|                                                            |                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [docs/DECISIONS.md](docs/DECISIONS.md)                     | What we build on, what it costs, what the alternatives were — with everything checked against Shopify's own documentation |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)               | How it fits together                                                                                                      |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md)                   | Every field, its type, who may change it, where it shows                                                                  |
| [docs/PJK-INTEGRATION.md](docs/PJK-INTEGRATION.md)         | The contract with PJK for artist sign-in and payouts                                                                      |
| [docs/SETUP.md](docs/SETUP.md)                             | Local development, step by step                                                                                           |
| [docs/PRIVACY.md](docs/PRIVACY.md)                         | What we keep and why (draft, needs a legal read)                                                                          |
| [docs/PHASES.md](docs/PHASES.md)                           | The plan, in three releases                                                                                               |
| [docs/REPOSITORY-SETTINGS.md](docs/REPOSITORY-SETTINGS.md) | The settings to apply by hand, and why                                                                                    |
| [.github/SECURITY.md](.github/SECURITY.md)                 | Reporting a security problem                                                                                              |

## Commands

|                                                |                                               |
| ---------------------------------------------- | --------------------------------------------- |
| `pnpm dev`                                     | The site, on port 3000                        |
| `pnpm build`                                   | A production build                            |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | The usual                                     |
| `pnpm test`                                    | Unit tests                                    |
| `pnpm test:e2e`                                | Browser tests (needs `pnpm mock:pjk`)         |
| `pnpm check:env`                               | That every environment variable is documented |
| `pnpm mock:pjk`                                | The stand-in for PJK's sign-in endpoints      |
| `pnpm shopify:setup --dry-run`                 | What the store schema script would do         |
| `pnpm shopify:setup`                           | Apply the store schema                        |

Everything above runs with no credentials. The storefront builds against `mock.shop` and the
browser tests run against that and the mock PJK, so the whole suite passes on a fresh clone.

## Working on this

- **Every change is its own commit**, with a message explaining _why_ rather than what.
- **One pull request per phase or feature**, into `main`, merged when the checks pass.
- **Secrets never go through chat, an issue, or a commit.** [docs/SETUP.md](docs/SETUP.md) shows
  the `read -s` commands.
- **Plain British English** in documents, comments and site copy. Site copy is short and
  declarative: no emoji, no exclamation marks, no hype.
- **This repository is public.** Nothing secret or personal in it, ever, and **never attach a
  self-hosted runner**.
- Dependencies are held back for a week before they can be installed, and no install script runs
  unless it is named in `pnpm-workspace.yaml` with a reason.

## Licence and ownership

© PAT and J.K. Co. All rights reserved. Artwork images belong to the artists who made them.
