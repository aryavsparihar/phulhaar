# The plan

The website is wanted **as soon as possible**, well before the gallery opens on 8 November 2026. So
this is not one launch but three, and the first one deliberately does not sell anything.

Effort is **days of focused work by one person**, and the ranges are honest rather than
encouraging. Anything that depends on somebody else answering a question says so.

---

## Release 1 — the catalogue, public, no checkout

The gallery's work, properly presented, with "enquire about this work" as the way to buy. It needs
no payment gateway, no GST decision, no artist sign-in and no shipping policy — which is exactly
why it can go up first. Staff load the artworks through the Shopify admin, which the schema from
Phase 0 already makes orderly.

### Phase 1 — The design, built once · **3–5 days**

Phulhaar's identity already exists; this turns it into a working set of components.

- The palette as tokens: cream ground `#FBF4E5`, surface `#F5EAD3`, ink green `#023118`, magenta
  `#C6014B`, leaf `#017448`, gold `#D3901E` for decoration and `#8A6A1F` when gold must carry
  meaning.
- The three typefaces self-hosted and subset: Marcellus for headings, Cormorant Garamond for
  display and italics, EB Garamond for text and small capitals. All SIL OFL.
- The marks from the brand pack: the full mark, the garland, the wordmark. **Never typeset
  "PHULHAAR"** — use the artwork. Cream or white grounds only; there is no reversed version.
- Layout, spacing and the grid the art sits in. Generous white space, no pop-ups, no countdowns, no
  discount banners.
- Mobile first, and tested that way. Most buyers will be on an Android phone in India.

_Needs from you:_ the brand source pack, or confirmation that the files already in PJK's
`public/brand/ventures/` are the ones to use.

### Phase 2 — The catalogue · **10–15 days**

The largest phase, and the one worth taking time over.

- Home, category landing pages, collection pages.
- **The artwork page:** images with zoom, the full label, the artist's note, "more by this artist",
  related works, recently viewed, share, and **"view in a room"** — the work drawn to scale on a
  wall from its centimetre dimensions, in the browser, free.
- **The artist page**, and the artist directory A–Z and by state.
- **Faceted filters**, through Search & Discovery on the metafields from Phase 0. Sixteen of them,
  which is close to Shopify's limit of 25 including its own.
- Predictive search across artworks and artists.
- Dominant-colour extraction from the main image at upload, for the colour filter.
- `VisualArtwork` + `Product` + `Offer` JSON-LD, and the `artist-name-title-year` handles.
- Images sized per screen, real contrast, keyboard navigable.

_Needs from you:_ ten or fifteen real artworks with real photographs. Building a gallery against
demo data hides everything that matters about how art reads on a page.

### Phase 3 — Enquiries, the legal pages, and going live · **4–6 days**

- **"Enquire about this work"** by email. A mailbox, not a ticket system — a firm rule.
- Visit the gallery, about Phulhaar, contact.
- Privacy, terms. `docs/PRIVACY.md` is drafted and needs a legal read.
- A strict CSP with nonces, HSTS, Referrer-Policy, Permissions-Policy.
- The nightly encrypted catalogue backup (`rclone` + `age` to Google Drive).
- The **Basic** plan, `phulhaargallery.com` on Cloudflare DNS, Oxygen deployment, and the
  repository settings in `docs/REPOSITORY-SETTINGS.md`.

_Needs from you:_ a legal read of the privacy note, the gallery's address and opening details, and
working `privacy@` and `security@` mailboxes.

> **Release 1 total: about 17–26 days.** Phase 2 is the risk; everything else is predictable.

---

## Release 2 — artists manage their own work

### Phase 4 — Artist sign-in · **3–5 days here, plus PJK's own work**

**Blocked on PJK.** The contract is written (`docs/PJK-INTEGRATION.md`) and the mock works, so
Phulhaar's half can be built and tested now, but nothing can go live until PJK ships its
endpoints.

- The sign-in pages, the session cookie, the JWKS verification.
- The lifecycle webhooks: approved, profile updated, suspended, reinstated, deleted.
- Artist profiles arriving from PJK instead of being typed in.

_Needs from you:_ the PJK side built from the contract, and a decision on the one open question in
it — Artist ID plus code on Phulhaar as asked, or a redirect flow. The recommendation, with the
trade-offs, is in that document.

### Phase 5 — The studio and staff review · **10–14 days**

- **My works**, with status: draft, in review, changes requested, live, sold, archived.
- Add and edit a work: every field from `docs/DATA-MODEL.md`, with help text, metric units and
  simple choices. **No minimum image size** — a firm rule.
- Images straight to Shopify through staged uploads, with progress and type checks.
- Submit for review, which creates a **draft** product. Staff approve or ask for changes.
  Approving publishes it. A live work that is edited goes back to review **while the published
  version stays as it is**.
- Reorder, archive, and see sales.
- CSRF on every state-changing request, zod validation of every field server-side, rate limits on
  uploads and edits, and the Artist ID checked against the work **on every request**.

_Needs from you:_ who on staff reviews works, and whether they work in the Shopify admin or want a
review page in the studio.

> This is the phase most likely to need a database, for upload rate limits and a review audit
> trail. The argument is already written in `docs/DECISIONS.md`, section 4.

---

## Release 3 — selling

### Phase 6 — Checkout, payments, shipping and GST · **6–9 days**

- A payment gateway: Razorpay, PayU or Cashfree. **Shopify Payments is not available in India.**
  Get written quotes; the published rates are a starting point.
- Shipping: zones, rates, who pays, insurance, packaging. Rolled against crated matters here.
- GST shown as required, and invoices.
- Buyers' accounts (Shopify's own, passwordless).
- Inventory of 1 on every original, so it reads as sold by itself.

_Needs from you, all of it before this phase starts:_ the commission and who sets the buyer's
price; GST registration status and whether displayed prices include GST; shipping arrangements and
the returns window; whether international buyers are allowed; and whether "make an offer" is
permitted — the default is enquiry by email only.

### Phase 7 — After a sale · **4–6 days**

- Mark the original sold, and email the artist and staff.
- Report the sale to PJK for payout, over the signed call in the contract. **A staff-exported
  spreadsheet is a perfectly good way to start** for the first few sales, and is less to get wrong.
- Optionally, a certificate-of-authenticity PDF generated at the sale.

### Phase 8 — Hardening, and then continuously · **ongoing**

- Performance on a mid-range Android phone on a slow connection, which is the real test.
- A full accessibility pass: contrast, focus order, screen reader, keyboard only.
- A load test before any launch that is being publicised.
- Prints and editions, if wanted. Print-on-demand costs money, so it stays deferred until asked
  for.

---

## What the dates look like

Starting now, at roughly four focused days a week:

|                                               |                                                    |
| --------------------------------------------- | -------------------------------------------------- |
| **Release 1 — catalogue, public, enquiries**  | about 6–9 weeks                                    |
| **Release 2 — artists manage their own work** | a further 4–6 weeks, after PJK ships its endpoints |
| **Release 3 — selling**                       | a further 3–4 weeks                                |

All three fit comfortably before 8 November 2026, with room for the gallery's own opening to
interrupt. The thing most likely to move the dates is not the code: it is **real artworks and real
photographs for Phase 2**, and **the PJK endpoints for Phase 4**. Both are worth starting now.

## What is settled and what is not

**Settled:** Hydrogen on Oxygen; Shopify as the system of record; no database of our own yet;
`phulhaargallery.com`; a minimal first release; the data model; the size bands (small under 45 cm,
medium 45–90, large 90–150, oversized 150 and over, by the longest side).

**Not settled, and listed in `docs/DECISIONS.md` section 5:** commission and who sets the price;
GST; shipping and returns; who reviews; international buyers; prints and editions; "make an
offer".
