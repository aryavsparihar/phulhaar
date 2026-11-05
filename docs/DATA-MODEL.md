# Data model

Every field Phulhaar stores, what type it is, who may change it, and where it appears.

`scripts/shopify/definitions.ts` is the authority. These tables were generated from it; if the two
ever disagree, the code is right and this page is stale. `scripts/shopify-setup.ts` applies it to a
store, and `scripts/shopify/definitions.test.ts` checks it against Shopify's documented limits.

## Where things live

| What                        | Where                                          | Why there                                                                               |
| --------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| An artwork                  | A Shopify **product**                          | It is the thing being sold; checkout, inventory and orders all hang off it              |
| Artwork details             | **Metafields** in the `phulhaar` namespace     | Typed, filterable, and versioned in this repository                                     |
| An artist                   | A `phulhaar_artist` **metaobject**             | Referenced by every one of their works                                                  |
| Taxonomies                  | Metaobjects, one definition each               | A display name separate from its handle, and the only way to get a colour swatch filter |
| Curated groupings           | **Collections**, manual and automated          | What "New this week" and "Under ₹10,000" are                                            |
| Images                      | Shopify **CDN**, as product media              | Free with the plan, resized by URL                                                      |
| Whether an original is sold | **Inventory of 1**                             | It sells out by itself, with no state for us to keep in step                            |
| An artist's session         | A signed **cookie** holding only the Artist ID | Nothing worth stealing is in it                                                         |
| Identity, KYC, bank details | **PJK. Never here.**                           | See `docs/PRIVACY.md`                                                                   |

## Who may set what

Four kinds of writer, and the studio enforces the distinction on every request:

- **artist** — the artist who owns the work, through the studio, and only their own works.
- **staff** — PJK staff reviewing a submission, in the Shopify admin or the review page.
- **computed** — derived by the server from other fields. Not editable by anyone, because a
  human-set value would eventually contradict the thing it is derived from.
- **pjk** — arrives from PJK through the lifecycle webhook. Not editable here at all; the approved
  profile lives in PJK and this is a copy of it.

Shopify has no concept of a required product metafield — only metaobject fields have one — so the
`required` flags in the definitions file are enforced by the studio's own validation when a work is
submitted, not by the store. That makes server-side validation of every field load-bearing rather
than belt-and-braces.

## The artwork

Title, description, price, handle, images and inventory are Shopify's own product fields. Weight is
the native variant weight. Everything else is a metafield:

| Field                       | Type      | Who sets it | Filter |
| --------------------------- | --------- | ----------- | ------ |
| `phulhaar.artist`           | ref       | pjk         | yes    |
| `phulhaar.year`             | integer   | artist      | —      |
| `phulhaar.category`         | ref       | artist      | yes    |
| `phulhaar.mediums`          | ref list  | artist      | yes    |
| `phulhaar.surface`          | ref       | artist      | yes    |
| `phulhaar.styles`           | ref list  | artist      | yes    |
| `phulhaar.traditions`       | ref list  | artist      | yes    |
| `phulhaar.subjects`         | ref list  | artist      | yes    |
| `phulhaar.artist_note`      | long text | artist      | —      |
| `phulhaar.height_cm`        | decimal   | artist      | —      |
| `phulhaar.width_cm`         | decimal   | artist      | —      |
| `phulhaar.depth_cm`         | decimal   | artist      | —      |
| `phulhaar.orientation`      | text      | computed    | yes    |
| `phulhaar.size_band`        | text      | computed    | yes    |
| `phulhaar.rarity`           | text      | artist      | yes    |
| `phulhaar.edition_size`     | integer   | artist      | —      |
| `phulhaar.edition_number`   | integer   | artist      | —      |
| `phulhaar.signed`           | boolean   | artist      | yes    |
| `phulhaar.has_certificate`  | boolean   | artist      | —      |
| `phulhaar.framed`           | boolean   | artist      | yes    |
| `phulhaar.frame_details`    | text      | artist      | —      |
| `phulhaar.ready_to_hang`    | boolean   | artist      | yes    |
| `phulhaar.ships_as`         | text      | artist      | —      |
| `phulhaar.ships_from_city`  | text      | artist      | —      |
| `phulhaar.ships_from_state` | ref       | artist      | yes    |
| `phulhaar.dispatch_days`    | integer   | artist      | —      |
| `phulhaar.availability`     | text      | staff       | yes    |
| `phulhaar.colours`          | ref list  | computed    | yes    |
| `phulhaar.review_status`    | text      | staff       | —      |
| `phulhaar.review_notes`     | long text | staff       | —      |
| `phulhaar.submitted_at`     | date_time | computed    | —      |

### The computed three

- **`orientation`** — portrait, landscape or square, from height against width, with a one per
  cent tolerance so a canvas measured at 60 × 60.5 cm is square rather than a portrait.
- **`size_band`** — from the longest side including depth: small under 45 cm, medium 45–90, large
  90–150, oversized 150 and over. A work exactly on a boundary goes into the upper band, so a
  buyer who looks at every band sees every work once. The four bands were confirmed on 31 October 2026. Changing one later means recomputing the band on every live work, so it is a migration
  rather than an edit.
- **`colours`** — extracted from the main image at upload. Staff can correct it, because a
  photograph of a painting under warm light often reads wrongly.

The rules are in `app/lib/artwork.ts` and tested in `app/lib/artwork.test.ts`. They are stored
rather than calculated at render time because a Shopify filter can only read a stored value.

### Why `availability` exists alongside inventory

Inventory of 1 already makes an original read as sold. `availability` covers only what stock
cannot say: a work **reserved** for a buyer, one **not_for_sale** that is shown but cannot be
bought, and one at **price_on_request**. `available` and `sold` are there so the field is never
ambiguous.

## The artist

Filled from the public profile PJK staff approved, through the lifecycle webhook. Nothing here is
editable in Phulhaar.

| Field             | Type      | Who sets it |
| ----------------- | --------- | ----------- |
| `artist_id`       | text      | PJK         |
| `display_name`    | text      | PJK         |
| `biography`       | long text | PJK         |
| `statement`       | long text | PJK         |
| `portrait`        | file      | PJK         |
| `city`            | text      | PJK         |
| `state`           | ref       | PJK         |
| `mediums`         | ref list  | PJK         |
| `traditions`      | ref list  | PJK         |
| `exhibitions`     | long text | PJK         |
| `links`           | url list  | PJK         |
| `pjk_verified`    | boolean   | PJK         |
| `standing`        | text      | PJK         |
| `profile_version` | integer   | PJK         |

`artist_id` matches `^(AT|PT)\d{6,}$` and is the join between the two systems. `profile_version`
exists so a webhook arriving out of order cannot overwrite newer data with older. `pjk_verified`
is the "PJK verified" mark on the artist page: what the identity checks were and what they found
stays in PJK, and only the flag crosses over.

There is no email address, no phone number, no postal address and no date of birth, and the unit
test asserts that no field is ever added with a name that looks like one.

## Taxonomies

Seeded on the first run of the setup script. Staff may add entries in the admin; the script never
deletes one, because deleting it would strip it from every artwork that references it.

| Taxonomy                 | Type                 | Entries seeded |
| ------------------------ | -------------------- | -------------- |
| Artwork category         | `phulhaar_category`  | 9              |
| Medium                   | `phulhaar_medium`    | 17             |
| Surface or support       | `phulhaar_surface`   | 12             |
| Style                    | `phulhaar_style`     | 10             |
| Indian tradition         | `phulhaar_tradition` | 16             |
| Subject                  | `phulhaar_subject`   | 14             |
| Dominant colour          | `phulhaar_colour`    | 15             |
| State or union territory | `phulhaar_state`     | 36             |

The colour taxonomy carries an extra `swatch` colour field, which is what lets Search & Discovery
render the colour filter as swatches instead of words.

## Filters

**Shopify allows 25 filters per store, standard and custom together.** The sixteen marked above,
plus Shopify's own price and availability, leaves about seven spare. Adding a facet later means
giving one up.

Turning them on is a manual step the Admin API does not cover: open the free **Search &
Discovery** app and add each one. The setup script prints the count as a reminder when it finishes.

Shown on the artwork page but deliberately **not** filters, because they are things a buyer reads
once they are interested rather than narrows by: year, exact dimensions, edition size and number,
certificate, frame details, how it ships, dispatch time, and the artist's note.

## Review states

`phulhaar.review_status`, with the product's own draft/active status doing the publishing:

| State               | Product status | Who moves it here                     |
| ------------------- | -------------- | ------------------------------------- |
| `draft`             | draft          | the artist, while still working on it |
| `in_review`         | draft          | the artist, on submitting             |
| `changes_requested` | draft          | staff, with `review_notes`            |
| `approved`          | **active**     | staff — this is what publishes it     |
| `archived`          | draft          | the artist or staff                   |

A live work that is edited goes back to `in_review` **while the published version stays exactly as
it was**, so a buyer never sees a half-edited page and an artist is never punished for fixing a
typo. How that is held — a duplicate draft product, or the edit staged in a metafield — is a Phase
5 decision and is not settled here.

## SEO

- **Handle:** `artist-name-title-year`, from `artworkHandle()`. It is the permanent URL, so the
  studio asks for a different title rather than silently appending a number when Shopify refuses a
  duplicate.
- **Meta description:** Shopify's native SEO field.
- **JSON-LD:** `VisualArtwork` plus `Product` plus `Offer` on every artwork page.
