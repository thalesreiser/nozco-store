# Spike 0001 - Admin access (BE-01.3)

- **Status:** research finished, decision pending (Thales). This is not an ADR.
- **Requirements:** RF-14 (back-office login with 2FA and roles; an operator cannot change prices or
  users), RNF-03 (2FA, rate-limited login, audit log of sensitive changes).
- **Version checked:** `@medusajs/medusa`, `@medusajs/framework` and `@medusajs/dashboard` 2.22.3, as
  pinned in `apps/backend/package.json`.
- **Research date:** 2026-11-05. Nothing was built or run: source was read, not executed.

## Answer

| Requirement | Medusa 2.22.3 without a licence | Gap |
|---|---|---|
| 2FA | **Yes.** TOTP and recovery codes, in the Admin profile page | Opt-in per user: nothing found that makes it mandatory. Secret API keys skip it. `AUTH_MFA_ENCRYPTION_KEY` is missing from our env schema |
| Roles | **No.** RBAC exists and ships in the package, but needs an Enterprise licence | Every admin user has full access, including prices and users |
| Rate-limited login | **No.** Nothing found on the password login | Only the MFA challenge has an attempt limit |
| Audit log | **No.** Nothing found in the code. Audit logs are listed as an Enterprise plan feature | Events carry IDs and no actor, so they cannot answer "who changed this" |

**Recommendation:** Option C, a reduced requirement for launch, if Q-07 confirms that nobody with
restricted access operates the back office at launch. If someone does, Option A. See
[Recommendation](#recommendation).

## Findings

### 2FA

Native and free of any licence check found: `@medusajs/auth` declares `"license": "MIT"`.

- The Auth Module provides `totp` and `recovery_code` from v2.15.5 ([MFA guide][mfa]). The Admin exposes
  it under Settings, Profile ([profile guide][profile]). The installed dashboard bundle contains the
  factor and recovery-code calls.
- The login returns a challenge instead of a token when a factor is enabled. The installed
  `authenticate` middleware returns 401 until the challenge is completed
  (`framework/dist/http/middlewares/authenticate-middleware.js`).
- Challenge defaults: 5 minutes, 5 failed attempts ([options][authopts]). The source stores the attempt
  counter on the challenge (`auth/dist/services/auth-module.js`).

Gaps:

1. **Not mandatory.** The guide says: "By default, authenticated routes enforce MFA for any identity that
   has MFA enabled." The user guide presents it as a personal choice: "You can enable two-factor
   authentication (2FA) for your account to add an extra layer of security." We found no option that
   requires enrolment. `mfa_enabled` is available in the auth context, so a custom middleware could
   refuse users who have not enrolled (not proven).
2. **Disabling is weak by default.** `disable_policy` defaults to `session`. The guide says: "Use the
   `challenge` policy to protect users from a stolen session being used to remove their MFA factor."
3. **Secret API keys skip MFA.** `authenticate` accepts them and calls `next()` with the actor type
   `api-key` before any MFA check, on routes that allow the `api-key` type. Any custom guard must handle
   this actor explicitly, and creating such keys should be restricted.
4. **Our configuration has a gap.** The guide requires `AUTH_MFA_ENCRYPTION_KEY`, or enrolment fails with
   "MFA encryption key is required to use MFA methods". It is absent from `apps/backend/src/lib/env.ts`
   and `.env.example`. We did not find where the package reads the variable, so this rests on the docs.
5. **Lost device.** With no recovery codes and no authenticator, we found no documented way for another
   admin to reset a user's factor. A sole admin needs a written recovery procedure.
6. **Attempt limit is per challenge.** We found no counter per identity. Someone who already has the
   password may be able to request new challenges, which is one more reason to limit `/auth/*`.

### Roles (RBAC)

**Available in open source? No.** The code is in the package we install, but it is proprietary.

- **Status:** released as complete in v2.22.3 on 2026-11-04, the day before this spike. The release notes
  say: "Role-Based Access Control (RBAC) is now fully implemented across Medusa." and "Requires Enterprise
  License." ([v2.22.3][rel]). The docs give v2.21.0+ as the prerequisite and call what came before "the
  incomplete version of RBAC" ([RBAC][rbac]). It has about one day of public release history.
- **Licence:** "This feature requires an enterprise license." ([RBAC][rbac]). Packages:
  `@medusajs/rbac` declares `"license": "SEE LICENSE IN LICENSE"`, and its licence file is the Enterprise
  Edition licence. "Medusa distributes these features in the same packages as the rest of the
  application, but they only load when you configure a license key that covers them."
  ([Enterprise][ent]).
- **Without a key:** "If the key is missing or doesn't cover the `rbac` feature, the Medusa application
  exits at boot with an error." ([RBAC][rbac]). The `authorize` middleware is on core routes such as users and
  products, but it is a no-op unless the module is installed
  (`framework/dist/http/middlewares/authorize.js`).
- **Bypassing it is not an option:** "Possession of or access to the source code does not grant a
  license." and "Circumventing, disabling, or removing any license validation or feature-gating mechanism
  does not create a license and is itself a violation of this notice." ([licence][eelic]). Custom roles
  must be our own code and must not copy the listed Enterprise paths.
- **Cost:** not public. RBAC is only in the Enterprise plan, at "Custom" pricing ([pricing][price]). The
  Enterprise page lists "Cloud user" as a prerequisite, yet also describes setting the key "outside of
  Cloud" ([Enterprise][ent]). Whether a licence can be bought for self-hosting on Railway, and at what
  price, needs a question to Medusa sales.
- **Runtime dependency:** a licence reported as revoked makes the application exit, and an unreachable
  licence service only logs a warning ([Enterprise][ent]).
- **Would it meet RF-14 exactly?** Not proven. Policies are per resource, such as `product_variant:update`.
  `medusa/dist/api/admin/products/middlewares.js` has no price resource, and the variant routes accept
  `prices`. A licensed test is needed to see whether an operator can edit stock but not prices.

**Without a licence,** the `user` model has no role field: only name, e-mail, avatar and `metadata`
(`user/dist/models/user.js`). So all admin users are equal.

### Rate-limited login

Nothing built in.

- Searching the compiled `framework`, `auth-emailpass`, `user` and `medusa` packages for rate-limit,
  throttle and lockout terms finds nothing. In `auth`, the only hits are the MFA challenge limit and an
  unrelated JWKS client option. The full docs index (`llms-full.txt`) has no guide on limiting the login.
- Passwords use scrypt (`logN: 15`, `auth-emailpass/dist/services/emailpass.js`), which slows offline
  cracking but not online guessing, and makes each attempt costly for the server.
- The framework sets `trust proxy` to `1` (`framework/dist/http/express-loader.js`). Behind Cloudflare and
  Railway there may be two proxies, so `req.ip` may not be the client. An IP-based limit must prove this.

### Audit log

Nothing built in.

- The term "audit" does not occur in the compiled `framework`, `auth`, `user`, `core-flows` or `medusa`
  packages. The Medusa Cloud plan comparison lists "Audit logs" under Enterprise only ([pricing][price]).
  That row is about the plan; we could not tell whether it covers self-hosted instances.
- The docs suggest building on events: "Subscribe to these events to send confirmation emails, audit log
  entries, or admin notifications." ([MFA guide][mfa], about MFA events only).
- Workflow events are not enough. `product.updated` carries only IDs
  (`core-flows/dist/product/workflows/update-products.js`), with no actor and no old or new values.
- `req.auth_context.actor_id` is available in middleware, so a log at the HTTP layer can record who, what
  route and when. Capturing old and new values takes more work per resource.

## Options

Hours are estimates from reading the code, not measurements. All include the same **2 h baseline**: add
`AUTH_MFA_ENCRYPTION_KEY` to the env schema, set `disable_policy: "challenge"`, try enrolment on staging
and write the lost-device procedure. `docs/development-plan.md` has no implementation task for any of
this, so the hours below are additional to the current plan.

### Option A: Medusa extension (all four requirements in our code)

Middleware in `src/api/middlewares.ts`, a small custom module for roles and audit, and tests in CI.

| Work | Hours |
|---|---|
| Baseline | 2 |
| Refuse admins with no 2FA enrolled (allowing the routes needed to enrol) | 3 |
| Login limit in Redis on `/auth/user/*` and `/auth/mfa/*`, per IP and per e-mail | 4 |
| Role storage and default-deny guard for operators, with integration tests | 10 |
| Dashboard behaviour when the guard refuses (design decision for Thales) | 3 |
| Audit module, middleware and read-only route | 6 |
| **Total** | **28 (range 24-34)** |

The guard must be an **allow-list for operators**. A deny-list breaks silently when an upgrade adds a
route, and the surface is wide:

- Direct: `/admin/price-lists`, `/admin/price-preferences`, `/admin/users`, `/admin/invites`,
  `/admin/api-keys`.
- Body-level: `prices` on product and variant routes, including `batch` and `imports`, which are also
  routes an operator needs for stock and catalog work. These need body inspection.
- Other routes whose validators mention prices or amounts: shipping options, draft orders, order edits,
  claims, exchanges. Whether an operator may use these is a business rule.
- `POST /admin/workflows-executions/:workflow_id/run` runs a workflow by ID, so it could bypass any route
  rule. It must be refused for operators.

Security trade-offs:

- Meets all four requirements with no new vendor or licence, if the guard is complete.
- We own security code, and every Medusa upgrade can add routes. A guard bug means privilege escalation.
- The role must not be stored in `user.metadata`: the users validator accepts `metadata`, so a user could
  grant themselves a role.
- Not proven: custom route middleware has to run after the core one that authenticates, and the docs list
  core route middleware first. This is the first thing to test.
- The Admin keeps showing screens an operator cannot use, unless we also customise it.

### Option B: Cloudflare Access in front of the admin

Native 2FA behind an Access gate on the admin, so the Medusa login is not reachable from the internet.

| Work | Hours |
|---|---|
| Baseline | 2 |
| Access application, policies, separate admin hostname and path rules | 3 |
| Origin protection: validate the Access token and remove direct routes | 3 |
| **Total for what this option covers** | **8 (range 6-12)** |
| Audit middleware, still required by RNF-03 | +6 |

**Cost and limits checked:** Free is $0 for up to 50 users; Pay-as-you-go is $7 per user per month
([pricing][cfprice]). Access logs are kept 24 hours on Free and 30 days on Access plans; admin logs 18
months ([logs][cflogs]). Access supports 500 applications ([limits][cflimits]), which is more than enough.
Rate limiting on the Free plan is 1 rule, matching on path, counting by IP, with 10-second periods
([rules][cfrate]). Longer periods start at Pro, $20 per month billed annually ([plans][cfplans]).

| Requirement | Result |
|---|---|
| 2FA | **Yes, and mandatory.** Independent MFA supports TOTP, security keys and biometrics, and can apply to one application ([MFA][cfmfa], [methods][cfimfa]). The pricing page does not say whether the Free plan includes it: confirm before relying on it |
| Rate-limited login | **Largely.** Requests stop at the gate before reaching the password route. The gate's own limits were not checked |
| Roles | **No.** Policies select by path, so per-person path rules can hide `/admin/users` and `/admin/price-lists`. They cannot separate a stock update from a price change on the same product route, so the RF-14 criterion stays unmet |
| Audit log | **No.** "Authentication logs do not capture the user's actions during a self-hosted or SaaS application session." Per-request logs are for Enterprise: "Enterprise customers have access to detailed logs of requests on their Cloudflare dashboard." ([logs][cfauthlogs]) |

Security trade-offs:

- Strongest reduction of attack surface, and no security code of ours to maintain for the gate.
- **Origin bypass is the main risk.** The docs require validating the token: "Token validation ensures that
  any requests which bypass Cloudflare Access (for example, due to a network misconfiguration) are
  rejected." ([self-hosted app][cfapp]). Railway gives services `*.up.railway.app` domains
  ([domains][raildom]), and those would skip Access unless removed or checked. Using `cloudflared` instead
  means one more always-on service, which counts against Q-02.
- **Paths are shared with customers.** `/auth/session` and `/auth/token/refresh` also serve the customer
  login, and `/store` and `/hooks` must stay public for the storefront and for payment and shipping
  webhooks. A separate admin hostname avoids this, but the API hostname must then block `/app`, `/admin`
  and `/auth/user`. Railway Hobby allows 2 custom domains per service ([domains][raildom]).
- Requires an active Cloudflare zone for the domain ([self-hosted app][cfapp]). The architecture places
  the storefront on Cloudflare, but we did not verify that `nozco.com.br` DNS is there.
- An outage or lost access at Cloudflare locks out the back office, so a break-glass path is needed.

### Option C: reduced requirement for launch

Launch with one role. All back-office users are full admins, 2FA is mandatory, the login is limited and
sensitive changes are logged. The operator role comes later as an additive change.

| Work | Hours |
|---|---|
| Baseline | 2 |
| Refuse admins with no 2FA enrolled | 3 |
| Login limit in Redis | 4 |
| Audit module, middleware and read-only route | 6 |
| **Total** | **15 (range 12-19)** |
| Later, if needed: role guard and dashboard behaviour from Option A | +13 |

Security trade-offs:

- Meets 2FA, rate limiting and audit log. **Does not meet the RF-14 acceptance criterion** ("Given an
  operator, then they cannot change prices or users"), so RF-14 must be formally changed for launch.
- Audit detects misuse but does not prevent it. A stolen admin session, or one mistaken click, can change
  prices or users.
- Accounts must be individual, or the audit log says nothing. Shared logins must be forbidden.
- No new vendor, licence or monthly cost. Everything can be tested in CI.
- Cloudflare Access can be added later as hardening (about 6 h), with no rework.

### Comparison

| | A: extension | B: Access | C: reduced launch |
|---|---|---|---|
| Mandatory 2FA | Yes (ours) | Yes (at the gate) | Yes (ours) |
| Operator cannot change prices or users | Yes, to be proven | No | No, deferred |
| Rate-limited login | Yes | Largely | Yes |
| Audit of sensitive changes | Yes | Only with the +6 h | Yes |
| Hours | 28 | 8, or 14 with audit | 15 |
| New monthly cost | None | $0 on Free; more for logs or rules | None |
| Main risk | Incomplete guard | Origin bypass | No prevention, only detection |

### Not proposed

- **Medusa Enterprise licence.** It would be the supported route to roles and possibly audit logs, but the
  price and self-hosting terms are unknown and the feature is one day old. Worth a quote if Q-07 points to
  several restricted users.
- **Community plugins** (see [Unverified leads](#unverified-leads)). Not evaluated, and adding one is a
  dependency decision on security-sensitive code.

## Recommendation

**Option C**, on the assumption that the people operating the back office at launch can be trusted with
full access. It covers three of the four requirements for 15 h, adds no cost or vendor, and does not close
any door: the role guard can be added when someone needs restricted access.

It is not free of risk: RF-14 as written is not met, and that must be Thales's explicit choice, recorded
in the ADR and in `docs/02-requirements.md`.

### How Q-07 changes this

| Answer to Q-07 | Recommendation |
|---|---|
| Only Thales or one owner | **C.** Keep the lost-device procedure especially tight: there is no second admin |
| Two or three trusted people, all needing full access | **C**, with one account per person |
| Anyone who must not change prices or users at launch (employee, freelancer, agency) | **A**. RF-14 is then a real control and cannot be deferred |
| Several restricted people, or more than two kinds of role | **A** for launch, and ask Medusa for an Enterprise quote to compare with maintaining the guard |
| Operators work from unmanaged devices or from many places | Add the **B** gate to whichever option applies |

Q-07 also decides which routes an operator's allow-list contains: refunds, order edits and promotions all
move money, so "cannot change prices" alone does not define the role.

## Questions for Thales

1. Choose the option, or confirm the recommendation.
2. Answer Q-07: who operates the back office at launch, and what must each person be unable to do?
3. If Option C: do you accept changing RF-14 for launch?
4. Should a task be added to the plan? None of the options is covered by a current estimate.
5. How long must audit entries be kept? They can hold personal data (RNF-04).

## What was not verified

- Nothing was executed: no enrolment, login, middleware order or dashboard behaviour was tried.
- Searches of compiled code can miss code generated at runtime or named differently. "Nothing found" means
  exactly that.
- Whether RBAC can separate stock from price edits (needs a licence to test).
- Whether Medusa will license self-hosting on Railway, and at what price.
- Whether the "Audit logs" plan item applies to self-hosted instances.
- Independent MFA on the Cloudflare Free plan; whether `nozco.com.br` is on Cloudflare; whether Railway's
  generated domain can be removed.

## Sources

All opened on 2026-11-05, as the raw Markdown each site publishes, except the release notes (GitHub CLI)
and the licence (raw GitHub file, `develop` branch).

- [mfa]: https://docs.medusajs.com/resources/commerce-modules/auth/mfa
- [authopts]: https://docs.medusajs.com/resources/commerce-modules/auth/module-options
- [profile]: https://docs.medusajs.com/user-guide/settings/profile
- [rbac]: https://docs.medusajs.com/resources/enterprise/rbac
- [ent]: https://docs.medusajs.com/resources/enterprise
- [rel]: https://github.com/medusajs/medusa/releases/tag/v2.22.3
- [eelic]: https://github.com/medusajs/medusa/blob/develop/ENTERPRISE-LICENSE.md
- [price]: https://medusajs.com/pricing
- [cfprice]: https://www.cloudflare.com/plans/sase-zero-trust
- [cfplans]: https://www.cloudflare.com/plans/network-cdn
- [cflogs]: https://developers.cloudflare.com/cloudflare-one/insights/logs/
- [cfauthlogs]: https://developers.cloudflare.com/cloudflare-one/insights/logs/dashboard-logs/access-authentication-logs/
- [cflimits]: https://developers.cloudflare.com/cloudflare-one/account-limits/
- [cfrate]: https://developers.cloudflare.com/waf/rate-limiting-rules/
- [cfmfa]: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/
- [cfimfa]: https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/
- [cfapp]: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- [raildom]: https://docs.railway.com/networking/domains/working-with-domains

Installed source is under `node_modules/.pnpm/@medusajs+medusa@2.22.3_*/node_modules/@medusajs/`.

### Unverified leads

Seen only in search result snippets. Not opened, not relied on above.

- Community packages `@coddletech/medusa-admin-2fa`, `@perseidesjs/medusa-plugin-rate-limit`,
  `@devx-retailos/rbac`, `medusa-plugin-rbac` and `@caocuong2404/medusa-plugin-rbac`: compatibility with
  2.22.x and maintenance unknown.
- Cloudflare community posts saying that passing 50 seats bills every seat ($357 per month for 51), and
  that the Free checkout asks for a card for usage above free limits.
- Cloudflare Log Explorer pricing (first 10 GB free, then $1 per GB per month).
- GitHub discussion medusajs/medusa#9909 on building RBAC by hand, which predates the module.

[mfa]: https://docs.medusajs.com/resources/commerce-modules/auth/mfa
[authopts]: https://docs.medusajs.com/resources/commerce-modules/auth/module-options
[profile]: https://docs.medusajs.com/user-guide/settings/profile
[rbac]: https://docs.medusajs.com/resources/enterprise/rbac
[ent]: https://docs.medusajs.com/resources/enterprise
[rel]: https://github.com/medusajs/medusa/releases/tag/v2.22.3
[eelic]: https://github.com/medusajs/medusa/blob/develop/ENTERPRISE-LICENSE.md
[price]: https://medusajs.com/pricing
[cfprice]: https://www.cloudflare.com/plans/sase-zero-trust
[cfplans]: https://www.cloudflare.com/plans/network-cdn
[cflogs]: https://developers.cloudflare.com/cloudflare-one/insights/logs/
[cfauthlogs]: https://developers.cloudflare.com/cloudflare-one/insights/logs/dashboard-logs/access-authentication-logs/
[cflimits]: https://developers.cloudflare.com/cloudflare-one/account-limits/
[cfrate]: https://developers.cloudflare.com/waf/rate-limiting-rules/
[cfmfa]: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/
[cfimfa]: https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/
[cfapp]: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
[raildom]: https://docs.railway.com/networking/domains/working-with-domains
