# 012 - Operations and product card decisions

- **Status:** accepted
- **Date:** 2026-11-07
- **Decided by:** Thales Reiser
- **Reference:** Q-01, Q-03, Q-04, Q-05, Q-06, Q-07, RF-14, BE-01.3, FE-04.1a

## Context

Second round of the questions left open after the listing and the backend tasks, answered together after
comparing options.

## Options considered

The admin options are in `docs/spikes/0001-admin-access.md`. The others are short choices listed below.

## Decision

### Listing (#33)

- Filters take one value at a time, as they do now.
- Choosing a size happens on the product card, against the recommendation to send the customer to the product page.
- The "Últimas" tag appears at 5 units or fewer.
- The sale badge shows a calculated percentage, such as -20%.

### Product and sales

- **Q-03:** the launch size grid is P, M, G, GG, XGG. Garment types and fabric remain open.
- **Q-06:** a launch coupon. The percentage and the code remain open.
- **Q-05:** installments with a minimum value. The number of installments and the minimum remain open.
- **Q-04:** when the last unit has already been sold, contact the customer and offer an exchange or a refund.
  The Pix and boleto deadlines remain open.

### Operations

- **Q-07:** only Thales and people he fully trusts operate the back office, so the launch uses option C of the
  admin access study: one role, mandatory 2FA, a login limit and an audit log. Accounts are individual, and
  shared logins are forbidden.
- **Q-01:** an integrated invoicing system. The provider remains open, to confirm with the accountant.

## Consequences

- **RF-14 changes for launch.** Option C does not stop an operator from changing prices or users, because
  every back-office user is a full admin. The audit log detects misuse but does not prevent it. The operator
  role can come later as an additive change (about 13 h).
- New task BE-01.4 implements option C, estimated at 15 h in the study.
- New task FE-04.5 covers the percentage and the 5-unit rule. New task FE-04.6 covers choosing a size on the card.
- FE-04.6 depends on the cart and the product page. A size alone does not identify a variant when a product
  has several colours, so such a product sends the customer to the product page until a decision says otherwise.
- FE-04.6 must fit the initial JavaScript budget of 170 KB, which had 2.3 KB left after the listing. It may need
  to load on demand.
