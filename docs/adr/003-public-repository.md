# 003 - Public repository with a proprietary licence

- **Status:** accepted
- **Date:** 2026-11-05
- **Decided by:** Thales Reiser
- **Reference:** DEC-08, EST-03.1

## Context

The development laptop has no Docker or local PostgreSQL, so database-backed checks must run in GitHub
Actions. On the free plan, a private repository shares 2,000 Actions minutes a month with the owner's
other private repositories and has no branch protection.

## Options considered

1. **Public with the proprietary licence:** unlimited Actions minutes on standard runners, required
   checks, secret scanning and push protection at no cost. The code can be read by anyone, although the
   licence does not allow reusing it.
2. **Private on the free plan:** the code stays hidden, but CI competes for minutes and merges rely on a
   manual checklist.
3. **Private on a paid plan:** the code stays hidden and required checks are available, at a monthly
   cost and still with a minute limit.

## Decision

Option 1. The repository became public on 2026-11-05, after a full-history secret scan found nothing.

## Consequences

- `main` and `develop` require a pull request, linear history and resolved conversations, with no force
  push or deletion, and the rules also apply to admins. No approval is required, since there is one
  maintainer. EST-03.1 adds the CI jobs as required checks.
- Secret scanning, push protection and private vulnerability reporting are enabled.
- Database-backed validation of the backend runs in CI. Local Docker stays optional (EST-02.1).
- Secrets, customer data and business-sensitive data must never enter the repository (`CLAUDE.md`).
  Draft legal texts and real tax settings stay in private documents.
- The e-mail of the person who merges through the GitHub interface appears in those commits.
