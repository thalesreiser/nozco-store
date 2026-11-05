# Security policy

This repository holds the code of the NozCo online store (nozco.com.br), a real business that handles
customer orders, payments and personal data. Please report any vulnerability privately so it can be
fixed before it is exposed.

## Supported branch

| Branch    | Purpose                      | Supported |
| --------- | ---------------------------- | --------- |
| `main`    | Production releases          | Yes       |
| `develop` | Integration branch (staging) | Yes       |

Fixes land on `develop` and reach production through `main`. Other branches and old tags are not
supported.

## Reporting a vulnerability

Use GitHub private vulnerability reporting:
[open a private report](https://github.com/thalesreiser/nozco-store/security/advisories/new).

This is the only reporting channel at the moment. **Do not open a public issue, pull request or
discussion about a vulnerability.**

Include, in English or Portuguese:

- the affected component, URL or file;
- the steps to reproduce it, and the impact you expect;
- the commit or date on which you observed it.

Never include real customer data, credentials or card numbers in a report. Describe them instead, for
example by saying which field was exposed.

## Scope

In scope:

- **Storefront:** `apps/storefront` and the public website.
- **Backend:** `apps/backend`, its APIs and the back office.
- **Workflows:** `.github/workflows` and anything that could expose secrets or alter a release.
- **Payment data:** the payment flow, Mercado Pago webhooks and any way to change the amount or status
  of an order.
- **Personal data:** access to the data of another customer, such as CPF, address, e-mail or orders.

Out of scope:

- flaws in third-party services (report them to the provider, and tell us only if our use of the service
  makes the problem worse);
- denial of service, spam and social engineering;
- reports from automated tools with no demonstrated impact.

## Testing rules

- Use only your own test accounts and data.
- Stop as soon as you reach data that is not yours, do not keep a copy, and mention it in the report.
- Do not disrupt the store, place fraudulent orders or run load tests against it.
- Keep the details private until a fix has been released.

## Response

Responses are **best effort**, with no guaranteed deadline. Reports are reviewed in the advisory thread, where we will discuss the impact and any fix with you and
tell you when it has been released. Reports affecting payments or personal data come first.

There is no bug bounty programme.
