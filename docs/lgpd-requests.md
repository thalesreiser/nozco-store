# LGPD requests

How a data subject asks for their data or its deletion (BE-03.3, RNF-04). Retention periods and the
legal wording are not decided here; the open points are listed at the end.

## Routes

| Route | Who | What it does |
|---|---|---|
| `POST /store/customers/me/privacy-requests` `{ "type": "export" }` | Customer | Answers with the export as JSON, at once. It is stored nowhere |
| `POST /store/customers/me/privacy-requests` `{ "type": "deletion" }` | Customer | Records a pending request. Nothing changes yet |
| `GET /store/customers/me/privacy-requests` | Customer | Their own requests |
| `GET /admin/privacy-requests` | Operator | The log, with `type`, `status`, `limit` and `offset` |
| `POST /admin/privacy-requests/:id/approve` | Operator | Runs the anonymisation. Approving a failed request resumes it |
| `POST /admin/privacy-requests/:id/reject` `{ "reason": "..." }` | Operator | Closes the request and changes no data. The reason is required, up to 500 characters, and the customer sees it on `GET /store/customers/me/privacy-requests` |

The customer comes from the session only; a body that names one is refused. Data is matched by
`customer_id`, never by e-mail, because Medusa does not verify an address on registration.

**Guests are left out.** Their way of proving identity depends on DEC-05, which is open. A guest order
that has the same e-mail as an account is neither exported nor changed.

## What an anonymisation does

| Data | Result |
|---|---|
| Customer: e-mail, first and last name, company, phone, metadata | Set to null. The empty row is soft-deleted |
| Customer addresses | Deleted |
| Login (auth identity and its e-mail and password hash) | Deleted, using Medusa's `removeCustomerAccountWorkflow`. If the same login also belongs to a back-office user, only the customer's link is removed |
| Carts, open or completed: e-mail, all metadata (CPF included) | Set to null |
| Cart addresses: every field | Set to null |

## What stays, and why

No order data is changed. The periods for keeping it are still to be defined with the accountant or a
lawyer (see below).

| Field | Why it stays |
|---|---|
| `order.metadata.cpf` | Recipient of the NF-e and of the tax records |
| `order.shipping_address`, `order.billing_address` (name, address, phone) | Recipient on the NF-e, and proof of delivery for exchanges and disputes |
| `order.email` | Contact for an open exchange, return or warranty (CDC). It is not an NF-e requirement, so it is the first candidate to remove once the lawyer answers |
| `order.items`, totals, `display_id`, dates, status, currency | The sale itself, for tax and accounting |
| Payments, fulfillments and their addresses linked to the order | Proof of payment and delivery |
| `order.customer_id`, `cart.customer_id`, the customer row's ID | Keep the record consistent and let a failed request resume. They point at an empty row and identify nobody on their own |
| Cart rows, without personal data | A completed cart is linked to its order |
| Request log: `customer_id`, `type`, `status`, dates, `decided_by`, `failure_code`, `rejection_reason` | Proves that the request was answered. The reason is its only free text: see below |

## The reason for a refusal

Decided in [ADR 011](adr/011-store-decisions-2026-11-07.md) (BE-03.6). **Operators must not type personal data in the reason**: no CPF, name,
address, order data or anything else that identifies the person. The customer reads it, and it stays in
the log even if a later deletion of the same customer is approved, because an anonymisation does not change
the log. The API cannot tell whether a text holds personal data, so this rule depends on the operator.

The reason is never logged: validation errors name the field only, a failed save logs the error's name
only, and neither repeats the text.

The wording of the reasons still needs a lawyer's review.

## Known limits

- A token issued before the anonymisation stays valid until it expires, and Medusa's own routes still
  accept it. The privacy routes answer 404 to it. Anything the person sends with it is new data.
- Backups hold the old data until they rotate.
- The CPF is read from metadata for now. BE-03.4 moves it to protected storage and must update the export
  and the anonymisation; the order's CPF stays there under the same rule.
- Data of integrations that do not exist yet is not covered, and each one must extend
  `anonymiseCustomer` when it arrives: Mercado Pago payment sessions and account holders (BE-05),
  Melhor Envio shipping method data (BE-06), the e-mail notification log (BE-09.1), the newsletter
  (BE-09.2).

## Pending decisions

These are in the BE-03.3 PR, for Thales with the accountant or a lawyer: retention of fiscal records and
of the request log, whether `order.email` stays, and how guests prove identity (DEC-05). Until the first
two are answered, nothing is deleted on a schedule.
