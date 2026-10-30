# Decisions

What we are building on, what it costs, and what the alternatives were. Every claim about Shopify
below was checked against Shopify's own documentation on **31 October 2026**, with the link beside
it. Shopify changes its plans and features often, so anything load-bearing should be rechecked
before launch.

Where the build brief turned out to be wrong, it says so.

---

## 1. Verified facts

### Shopify Payments is still not available in India

Shopify's own list of where Shopify Payments works gives 41 countries and regions, and India is
not among them. The page says plainly that if your country is not listed you need a third-party
provider.

- [Shopify Payments requirements](https://help.shopify.com/en/manual/payments/shopify-payments/shopify-payments-requirements)

Some blogs claim Shopify Payments rolled out to India during 2024–2026. Shopify's own
documentation does not support that. **The brief is right on this point.**

### Plan prices in India, and the third-party gateway fee

From Shopify's India pricing page:

| Plan     | Annual billing | Monthly billing   | Fee on a third-party gateway |
| -------- | -------------- | ----------------- | ---------------------------- |
| Basic    | ₹1,499/mo      | ₹1,994/mo         | 2%                           |
| Grow     | ₹5,599/mo      | ₹7,447/mo         | 1%                           |
| Advanced | ₹22,680/mo     | ₹30,164/mo        | 0.6%                         |
| Plus     | not shown      | from ₹1,75,000/mo | 0.2%                         |

- [Shopify pricing, India](https://www.shopify.com/in/pricing)

That extra fee is Shopify's charge for not using Shopify Payments. Because Shopify Payments cannot
be used in India at all, **every Indian merchant pays it** — it is not avoidable by choosing
differently.

The pricing page does not say whether GST is included or added. Indian blogs consistently say 18%
is added. **Treat the plan as ₹1,499 + 18% ≈ ₹1,769 a month and confirm it on the first invoice.**

### Oxygen is included on more plans than the brief thought

Shopify's Hydrogen documentation says Oxygen is available at no extra charge on **Starter, Basic,
Grow, Advanced, Plus, and Pause and build**. It is not available on Agentic plans.

It also confirms that **development stores can deploy to Oxygen**, so the whole site can be built
and previewed before any plan is paid for. Those deployment URLs require a store login, because
development stores have no public environments.

- [Hydrogen fundamentals](https://shopify.dev/docs/storefronts/headless/hydrogen/fundamentals)

**The brief is wrong on two small points:** it says Oxygen is included "on paid plans except
Starter", and it treats development-store deployment as something to verify. Starter is included,
and development-store deployment works.

### Hydrogen is built on React Router, not Remix

Confirmed in the same documentation. Remix survives only in old package names such as
`@shopify/remix-oxygen`. The scaffolded app in this repository is React Router 7. **The brief is
right.**

### Search & Discovery can filter on metafields, with real limits

The free Search & Discovery app builds a storefront filter from a metafield only when:

- the metafield has a **definition** and a value stored on the product or variant, and
- its type is one of: single line text, single line text (list), decimal, integer, true/false,
  metaobject reference, metaobject reference (list).

A **colour swatch** filter additionally needs the values to be metaobjects carrying a real colour
field plus a single-line text field for the name.

**A store may have 25 filters in total**, standard and custom together, and each source may be
used only once.

- [Search & Discovery filters](https://help.shopify.com/en/manual/online-store/search-and-discovery/filters)

This is the single tightest constraint on the catalogue. The brief lists thirteen facets; the
schema in this repository defines sixteen filterable fields, which with Shopify's own price and
availability filters leaves roughly seven spare. `docs/DATA-MODEL.md` records which fields are
filters and which are shown but not filtered. Adding a facet later means removing one.

### Metaobject and metafield limits are not a problem

| Limit                                                   | Value     |
| ------------------------------------------------------- | --------- |
| Metaobject definitions per shop (Basic, Grow, Advanced) | 128       |
| Entries per metaobject definition                       | 1,000,000 |
| Fields per metaobject definition                        | 40        |
| Metafield definitions per resource type                 | 256       |

- [Metaobject limits](https://shopify.dev/docs/apps/build/custom-data/metaobjects/metaobject-limits)
- [Metafield limits](https://shopify.dev/docs/apps/build/metafields/metafield-limits)

Phulhaar uses 8 metaobject definitions, 1 artist definition with 14 fields, and 31 product
metafield definitions. There is a very large amount of room.

The old plan-based entry caps of 64,000 and 128,000 were removed in late 2025.

### Staged uploads are the right way to take an artist's images

`stagedUploadsCreate` returns a temporary, pre-authorised upload target. The browser sends the
file straight to it and the server then attaches the returned `resourceUrl` to the product. The
image never passes through our worker, which matters because Oxygen is not the place to buffer a
40 MB photograph.

- [stagedUploadsCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/stagedUploadsCreate)

### Buyers' accounts are already passwordless

Shopify's customer accounts sign in with a one-time six-digit code by email. No password, nothing
for us to store, nothing for us to leak.

- [Customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts)

This is entirely separate from artist sign-in, which goes through PJK.

---

## 2. What it actually costs

### Before launch: nothing

A Shopify **Partner account** and a **development store** are free, and Oxygen deploys from a
development store. The whole catalogue, the artwork and artist pages and the artist studio can be
built, reviewed and demonstrated without paying anything. The only limitation is that the
preview URL needs a store login, which is acceptable while the audience is us.

### At launch: the Basic plan

|                         | Per month    |
| ----------------------- | ------------ |
| Basic, billed annually  | ₹1,499       |
| GST at 18% (to confirm) | ₹270         |
| **Total**               | **≈ ₹1,769** |

About **₹21,200 a year**. Billing monthly instead costs ₹1,994 + GST ≈ ₹2,353, so roughly ₹7,000
a year more for the flexibility.

### Per ₹10,000 sale

Two fees stack: Shopify's third-party-gateway fee and the gateway's own charge. Indian payment
gateways publish around 2% for domestic cards, net banking and UPI, with 18% GST on the fee.

|                           | Basic             | Grow              |
| ------------------------- | ----------------- | ----------------- |
| Shopify's third-party fee | ₹200 (2%)         | ₹100 (1%)         |
| GST on that, 18%          | ₹36               | ₹18               |
| Gateway fee at 2%         | ₹200              | ₹200              |
| GST on that, 18%          | ₹36               | ₹36               |
| **Total**                 | **≈ ₹472 (4.7%)** | **≈ ₹354 (3.5%)** |

So on Basic, roughly **₹9,530 of a ₹10,000 sale reaches us** before the artist's share.

Two things to be careful about:

- **Whether GST applies to Shopify's own fee needs confirming on a real invoice.** If it does not,
  Basic is about ₹436 (4.4%) instead.
- **Gateway rates are negotiable and the published ones are a starting point.** Get a written
  quote from Razorpay, Cashfree and PayU before choosing. Several carry promotional rates: one
  comparison reports Cashfree offering 0% on a new merchant's first ₹20 lakh of volume, subject to
  conditions. Worth asking about; not worth relying on.

**Where the switch to Grow pays for itself:** Grow costs ₹4,100 more a month than Basic and saves
1% of revenue. That is break-even at about **₹4,10,000 of monthly sales**. Until Phulhaar is
turning over roughly ₹4 lakh a month, Basic is the cheaper plan. Revisit it, with the real
numbers, rather than on a feeling.

### Everything else is free

| Need               | Tool                                                 | Cost     |
| ------------------ | ---------------------------------------------------- | -------- |
| Hosting            | Shopify Oxygen                                       | included |
| Images and CDN     | Shopify CDN                                          | included |
| Filters and search | Search & Discovery app                               | free     |
| Code and CI        | GitHub public, GitHub Actions                        | free     |
| Scanning           | CodeQL, Semgrep, gitleaks, Trivy, Dependabot         | free     |
| Tests              | Vitest, Playwright                                   | free     |
| DNS, analytics     | Cloudflare free tier                                 | free     |
| Backups            | rclone + age to Google Drive                         | free     |
| Fonts              | Marcellus, Cormorant Garamond, EB Garamond (SIL OFL) | free     |

Nothing in this project needs a database of its own yet. See section 4.

---

## 3. Recommendation: confirm Hydrogen on Oxygen

**Build the storefront and the artist studio as one Hydrogen app on Oxygen.** This is what the
brief proposed, and having checked it, it is right.

Why:

- **One codebase and one host.** The storefront and the studio share the session, the design and
  the deployment. The alternative needs two of each.
- **Secrets stay on the server.** The studio has to call the Admin API with a token that can
  create products. In Hydrogen that call happens in a server route. In a Liquid theme there is
  nowhere to put it.
- **The design is ours.** A gallery wall rather than a marketplace is mostly a matter of
  restraint, and restraint is easier when nothing is fighting a theme's assumptions.
- **It costs nothing extra**, and it is already running in this repository against mock.shop.

### The alternative, and why not

**An Online Store 2.0 Liquid theme.** Simplest thing that could work, Shopify-hosted, and for a
catalogue-plus-enquiries release it would reach a first page faster than Hydrogen will — there is
no build step and the filters come for free.

The reason not to: the artist studio then needs a separate host, which means a second deployment,
a second set of secrets, a second thing to keep patched, and a sign-in session that has to work
across two origins. Cloudflare Workers would do it free, and that is still two of everything. Given
that the studio is most of the brief, paying the Hydrogen cost once is better than paying the
two-host cost for ever.

**If the catalogue needs to be public in weeks rather than months, say so** and the honest answer
changes: put a Liquid theme up as a holding catalogue, keep building Hydrogen behind it, and swap.
That is more total work, so it is only worth it if the date is real.

### Not Vercel

Vercel's Hobby tier forbids commercial use, and this site sells things. Oxygen is included with
the plan we are paying for anyway. **The brief is right.**

### Shopify Starter will not do, despite Oxygen

Starter is ₹399-ish a month and Oxygen is available on it, which looks like a way to launch for a
quarter of Basic's price. It does not work: **Starter has no product collections and no staff
accounts.**

- [Starter plan](https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/plans-features/shopify-starter-plan)

Collections are how the catalogue is organised — every curated grouping and category page in the
brief is a collection — and no staff accounts means only the proprietor could ever sign in to the
admin, so nobody could review a submitted work. Its third-party transaction fee is also reported
at 5%, which on ₹10,000 is ₹500 instead of ₹200. Basic is the floor.

---

## 4. No database of our own, for now

Shopify holds the state:

| What                             | Where                                                  |
| -------------------------------- | ------------------------------------------------------ |
| An artwork                       | A product, with metafields in the `phulhaar` namespace |
| A submitted work awaiting review | A **draft** product, with `phulhaar.review_status`     |
| An artist's public profile       | A `phulhaar_artist` metaobject, filled from PJK        |
| Taxonomies                       | Metaobjects, seeded by `scripts/shopify-setup.ts`      |
| Curated groupings                | Collections, manual and automated                      |
| Whether an original is sold      | Inventory of 1, so it sells out by itself              |
| Orders, buyers, checkout         | Shopify                                                |
| An artist's session              | A signed cookie, holding only the Artist ID            |

**What would justify adding one**, so that the argument is already written down when it comes up:

1. **Rate limiting the studio.** Counting uploads per artist per hour needs somewhere to keep the
   count. A metafield is the wrong shape and would be slow.
2. **An audit trail.** Who approved which work, and when. Shopify's own event log is thin and not
   queryable in the way a review history needs to be.
3. **Sessions that can be revoked.** A signed cookie cannot be invalidated before it expires. If
   suspending an artist has to log them out immediately rather than at their next sign-in, that
   needs server-side session state.

Any of those three is a good enough reason. When one arrives: **Neon or Supabase free Postgres**,
and the reason goes in this file first.

---

## 5. Still to decide

Needed before the phases that depend on them, not now:

- **Commission**, and whether the buyer's price is the artist's price or the artist's price plus
  commission.
- **GST registration status**, whether displayed prices include GST, and what an invoice must show.
- **Shipping:** who pays, which couriers, insurance, packaging standards, and the returns window.
- **Who on staff reviews works**, and whether they use the Shopify admin or a review page in the
  studio.
- **International buyers:** now, later, or never.
- **Prints and editions:** originals only at first, or editions too.
- **"Make an offer":** the default is enquiry by email only, which is a firm rule in the brief.

Settled already:

- **Launch:** as soon as possible, so the first release is deliberately minimal. See
  `docs/PHASES.md`.
- **Domain:** `phulhaargallery.com` is the main one, with `phulhaar.com`, `phulhaar.in` and
  `phulhaargallery.in` also held.
- **Size bands**, confirmed 31 October 2026, by the longest side including depth: small under
  45 cm, medium 45–90, large 90–150, oversized 150 and over. A work exactly on a boundary goes
  into the upper band. Changing a band later means recomputing it on every live work, so treat it
  as a migration rather than an edit.
