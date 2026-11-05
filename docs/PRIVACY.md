# Privacy note (draft)

What Phulhaar Gallery keeps, why, and for how long. **This is a working draft for review, not the
published privacy policy.** It needs a read by somebody who knows Indian data protection law
before it goes on the site, and the retention periods need checking against what the Income Tax
Act and GST rules actually require.

Written plainly on purpose. A privacy notice nobody can read is not consent.

## The short version

- **Buyers:** we keep what an order needs — name, delivery address, email, phone, what was bought.
  Shopify holds it. We do not see card details.
- **Artists:** we keep an Artist ID, a display name, a city and a state. **Nothing else.** No email
  address, no PAN, no Aadhaar, no bank details, no identity documents.
- **Visitors:** aggregate numbers only. No advertising trackers.

## Why artists' data is not here

PAT and J.K. Co. runs two systems. **pjk.co.in** onboards artists: it takes the application, checks
identity (PAN, Aadhaar, bank details, encrypted), has staff approve it, and deletes it on request.
**Phulhaar Gallery** sells the work.

The gallery is deliberately built so that it **cannot** hold identity data. When an artist signs
in, Phulhaar sends PJK an Artist ID; PJK emails the artist a code and, when it is correct, returns
a short-lived signed token containing a display name and whether the artist is in good standing.
Phulhaar never receives the email address the code went to.

This is not only a policy. The artist record has no field for any of it, and an automated test
fails the build if a field is ever added whose name looks like one
(`scripts/shopify/definitions.test.ts`).

So: **a request about identity documents or bank details goes to PJK**, because Phulhaar has
nothing to show.

## Buyers

### What we keep

| What                                | Why                                                      | Where   |
| ----------------------------------- | -------------------------------------------------------- | ------- |
| Name, delivery address, phone       | To send you a painting                                   | Shopify |
| Email address                       | Order confirmation, dispatch, and replies to an enquiry  | Shopify |
| What you bought, when, for how much | The order; tax and accounting records                    | Shopify |
| Billing address                     | GST invoicing                                            | Shopify |
| Account sign-in                     | A one-time code by email. **No password is ever stored** | Shopify |

### What we never see

**Card and bank details.** Payment is taken by a payment gateway (Razorpay, PayU or Cashfree —
Shopify Payments is not available in India) on their own pages. We receive confirmation that a
payment succeeded and a reference. We never receive, and cannot ask for, a card number.

### How long

- **Order records:** as long as tax and accounting law requires, then deleted. _The exact period
  needs confirming; Indian practice is commonly eight years._
- **An account you opened:** until you ask us to close it.
- **An enquiry email:** two years, then deleted.

### Enquiries

"Enquire about this work" sends an email to the gallery containing what you wrote and which work
you asked about. It is **a mailbox, not a ticket system** — a deliberate choice, so there is no
second place your message is stored and indexed. It is kept in the mailbox and deleted after two
years.

## Visitors

- **Shopify's built-in analytics:** page views and sales, aggregate.
- **Cloudflare Web Analytics**, if we turn it on: cookieless, no cross-site tracking, nothing that
  identifies you.
- **No advertising trackers, no Meta pixel, no Google Ads tags.** Nothing about what you looked at
  is sold or shared.

### Cookies

| Cookie        | What for                              | How long                         |
| ------------- | ------------------------------------- | -------------------------------- |
| Cart          | Remembering what you put in your cart | Until it expires or you clear it |
| Session       | Keeping you signed in                 | 30 days                          |
| Shopify's own | Checkout and fraud prevention         | Shopify's periods                |

**"Recently viewed" and favourites before you sign in are kept in your own browser**, in local
storage. They never reach our server.

There is no consent banner, because there is nothing to consent to: no cookie here is used for
advertising or tracking across sites. If that ever changes, a banner comes with it — and the
default will be to decline.

## Artists

### What Phulhaar holds

| What                                            | Where it came from                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| Artist ID (`AT000123`)                          | PJK                                                                 |
| Display name                                    | The approved public profile                                         |
| Biography, artist statement                     | The approved public profile                                         |
| Portrait                                        | The approved public profile                                         |
| City and state                                  | The approved public profile                                         |
| Mediums, traditions, exhibitions, awards, links | The approved public profile                                         |
| "PJK verified"                                  | A flag. **What the checks were, and what they found, stays in PJK** |
| Standing (active or suspended)                  | PJK                                                                 |
| Artworks and their details                      | The artist, through the studio                                      |
| A record of each sale, for payout               | Shopify, sent on to PJK                                             |

Everything in the top half is **the profile staff already approved for publication**. It arrives
from PJK and is not editable in Phulhaar.

### Sessions

A signed cookie holding **only the Artist ID, the profile version, and when it was issued.** No
name, no token, nothing from PJK. HttpOnly, Secure, SameSite=Lax, 30 days.

### Payouts

**PJK pays artists**, because PJK holds the bank details. Phulhaar tells PJK what sold — the work,
the Artist ID, and the amounts. **No buyer details are sent**: PJK does not need to know who bought
it, so it is not told.

### If an artist asks to be deleted

Ask PJK, which holds the identity data and already has a deletion process. PJK then tells Phulhaar,
and Phulhaar:

1. Deletes the artist's profile and portrait.
2. Deletes every artwork that has never been ordered, images included.
3. For a work that **has** been ordered: deletes the images, the description and the artist's note,
   and keeps the bare product record with the Artist ID as plain text — because the order it
   belongs to has to remain intelligible for tax and for the buyer.
4. Never alters the order records themselves.

Phulhaar reports back what it deleted, so PJK's own log is complete. The contract is in
`docs/PJK-INTEGRATION.md`.

### If an artist is suspended

Their works are **hidden, not deleted**. A suspension can be lifted; a deletion cannot.

## Where data is held

|                                      | Where                                                |
| ------------------------------------ | ---------------------------------------------------- |
| Catalogue, orders, customers, images | Shopify's infrastructure                             |
| The website itself                   | Shopify Oxygen                                       |
| DNS                                  | Cloudflare                                           |
| Nightly encrypted catalogue backups  | Google Drive, encrypted with `age` before they leave |
| Identity and KYC                     | **PJK, not here**                                    |

Shopify and Cloudflare are outside India, so some data is processed abroad. Both are large
providers with their own published terms, and we rely on those.

## Your rights

Email **privacy@phulhaargallery.com** to:

- ask what we hold about you;
- have something corrected;
- have it deleted, except what tax law requires us to keep;
- get a copy of your order history.

We aim to reply within **30 days**.

For an **artist's** identity data, PJK is the right place to ask. We will pass the request on
rather than leave you to find the form.

## Changes

Material changes will be dated on this page. If we ever start collecting something new, this page
changes **before** the collection starts, not after.

---

### Still to settle before publishing

- [ ] A read by someone who knows Indian data protection law, including the DPDP Act's
      requirements on notice and on a grievance officer
- [ ] The real retention period for order and tax records
- [ ] Whether a named grievance officer and address must be published
- [ ] Working `privacy@` and `security@` mailboxes
- [ ] Whether international buyers are allowed, which changes what crosses a border
