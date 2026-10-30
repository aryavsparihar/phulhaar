# Repository settings to apply

These are settings, not code, so they cannot be committed. This page is the proposal: it says what
to switch on, why, and gives the command where there is one. Everything here is free on a public
repository.

Apply it once, then tick the list at the bottom.

> Nothing here needs a paid GitHub plan. Advanced Security features that do cost money are called
> out as such and left off.

## 1. Required checks on `main` (a ruleset)

The point of a ruleset rather than the older branch protection is that it applies to everyone,
including the repository owner, unless an exemption is written down.

**Settings → Rules → Rulesets → New branch ruleset.**

- **Name:** `main`
- **Enforcement status:** Active
- **Target branches:** Include default branch
- **Rules to enable:**
  - Restrict deletions
  - Block force pushes
  - Require a pull request before merging
    - Required approvals: **1**
    - Dismiss stale pull request approvals when new commits are pushed
    - Require conversation resolution before merging
  - Require status checks to pass
    - Require branches to be up to date before merging
    - Required checks, by the name each job reports under:
      - `Lint, typecheck, unit tests, build`
      - `End-to-end`
      - `Secret scan`
      - `Dependency and config scan`
      - `Code scan (Semgrep)`
      - `CodeQL` — add this one only after step 3 below has run once, because a check that has
        never reported cannot be selected.

A note on the approval rule. On a one-person project an approval requirement means you cannot
merge your own pull request, which sounds like an obstacle and is in fact the point: it forces a
second pair of eyes on anything touching money, artists' data or the Admin API token. If it turns
out to block work, the honest fix is to add a second maintainer, not to drop the rule.

## 2. Workflow permissions, and outside contributors

**Settings → Actions → General.**

- **Fork pull request workflows from outside collaborators:**
  **Require approval for all external contributors.**
  A public repository otherwise runs a stranger's code on the first push to their pull request.
- **Workflow permissions:** Read repository contents and packages permissions.
  Each workflow asks for more only where it needs it; neither of ours does.
- **Allow GitHub Actions to create and approve pull requests:** off.

**Never attach a self-hosted runner to this repository.** It is public, so a self-hosted runner
would execute anybody's pull request on our own machine. Both workflows say `ubuntu-latest` and
nothing else.

## 3. CodeQL, through default setup

CodeQL is free on public repositories and needs no workflow file of ours.

**Settings → Code security → Code scanning → Set up → Default.**

Choose the JavaScript/TypeScript analysis and the default query suite. Let it run once, then come
back and add `CodeQL` to the required checks in step 1.

Default setup rather than a committed workflow because GitHub keeps the queries up to date itself,
which is one less thing to maintain and one less file to review.

## 4. Secret scanning with push protection

**Settings → Code security.**

- **Secret scanning:** on
- **Push protection:** on

Push protection is the one that matters: it refuses the push that contains a token rather than
telling you afterwards, when the secret is already in the history and has to be rotated. Our own
gitleaks job is the backstop for secrets GitHub does not recognise, including PJK's shared secret,
which looks like nothing in particular.

```bash
gh api -X PATCH repos/aryavsparihar/phulhaar -f 'security_and_analysis[secret_scanning][status]=enabled' -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
```

## 5. Dependabot

The schedule is committed in `.github/dependabot.yml`, monthly. Two switches are settings:

**Settings → Code security.**

- **Dependabot alerts:** on
- **Dependabot security updates:** on

Alerts are how an advisory about something we already depend on reaches us without waiting for the
Monday scan.

## 6. Private vulnerability reporting

**Settings → Code security → Private vulnerability reporting:** on.

This is what `.github/SECURITY.md` points people at, so that a stranger who finds a real problem
has somewhere to put it other than a public issue.

```bash
gh api -X PUT repos/aryavsparihar/phulhaar/private-vulnerability-reporting
```

## 7. Merges

**Settings → General → Pull Requests.**

- Allow squash merging: **on**, and set the default commit message to "Pull request title and
  description".
- Allow merge commits: off. Allow rebase merging: off.
- Automatically delete head branches: on.

One commit per pull request on `main` keeps the history readable, and the pull request description
is where the reasoning already is.

**Do not enable auto-merge.** A change here can publish an artist's work or alter a price, and
should go in because somebody decided to put it in.

## 8. Things deliberately not enabled

- **GitHub Advanced Security** beyond what is free on public repositories: it is charged per
  committer and buys us little while Semgrep and CodeQL default setup cover the same ground.
- **Self-hosted runners:** see step 2.
- **Deploy keys and long-lived personal access tokens:** nothing needs them yet. When Oxygen
  deployment is wired up it uses a Shopify-issued token held as an Actions secret.

## Checklist

- [ ] `main` ruleset active, with the five CI checks required
- [ ] External contributors' workflows need approval
- [ ] CodeQL default setup run once, and added to the required checks
- [ ] Secret scanning and push protection on
- [ ] Dependabot alerts and security updates on
- [ ] Private vulnerability reporting on
- [ ] Squash merging only, head branches deleted automatically
- [ ] No self-hosted runner attached
