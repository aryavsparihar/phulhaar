# Reporting a security problem

Phulhaar Gallery sells original work by Indian artists. A fault here can expose an artist's
details or take someone's money, so a report is welcome even if you are not sure it is a real
problem.

## How to report

Use GitHub's **private vulnerability reporting** on this repository: open the Security tab and
choose "Report a vulnerability". That opens a private thread with the maintainers; nothing is
public until we agree it should be.

If that is not available to you, email **security@phulhaargallery.com**.

**Please do not open a public issue or a pull request for a security problem.** A public issue
tells everyone else how to exploit it before it is fixed.

## What to include

Whatever you have. The most useful things are:

- what you did, step by step, and what happened;
- the URL or endpoint;
- what you think an attacker could get out of it;
- anything that shows it, such as a request and its response, with any secret removed.

## What to expect

- We aim to acknowledge a report within **three working days**. This is a small team in India, so
  allow for weekends and public holidays.
- We will tell you what we think the severity is and roughly when we expect to fix it.
- We will tell you when it is fixed, and credit you if you would like to be credited.

There is no bug bounty. There is no budget for one.

## What is in scope

- **phulhaargallery.com** and anything served from it, including the artist studio.
- This repository: the application code, the store schema script, and the GitHub Actions
  workflows.

Particularly interesting to us:

- anything that lets one artist see or change another artist's works;
- anything that gets the Shopify Admin API token or a PJK secret out of the server;
- anything that forges a signed request to or from PJK;
- anything that publishes a work without staff approval;
- anything that leaks personal data, which here means a buyer's order details.

## What is out of scope

- **Shopify itself**, including checkout, the Admin API and the CDN. Report those to
  [Shopify's own programme](https://hackerone.com/shopify).
- **pjk.co.in**, which is a separate system with its own reporting route. Artist identity
  documents and bank details are held there, not here.
- Findings from an automated scanner with nothing behind them: a missing header on a page that
  holds nothing, a version number in a response, a weak cipher nobody can reach.
- Denial of service by volume, social engineering, and physical access to the gallery.

Please do not test with real artists' or buyers' accounts, do not run load or denial-of-service
tests against the live site, and do not place real orders to demonstrate something. Ask us and we
will set up a test store.

## What this site deliberately does not hold

Worth knowing before you go looking for it: Phulhaar never stores PAN numbers, Aadhaar numbers,
bank details or identity documents. Those stay in PJK, which is the system that checks who an
artist is. Phulhaar knows an Artist ID, a display name, a city, and whether PJK says the artist is
in good standing. If you find any of the first group in this system, that is a serious finding and
we want to hear about it straight away.
