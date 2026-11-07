import { model } from "@medusajs/framework/utils"

/**
 * The log of data-subject requests: who asked (`customer_id`), what (`type`), when (`created_at`) and
 * the result (`status`, `failure_code`). It has no free-text column, so it cannot end up holding a CPF
 * or other personal data, and it outlives the customer's anonymisation. No workspace imports here:
 * `db:migrate` loads this file without building the packages.
 */
const PrivacyRequest = model
  .define("privacy_request", {
    id: model.id({ prefix: "pvreq" }).primaryKey(),
    customer_id: model.text(),
    type: model.enum(["export", "deletion"]),
    status: model.enum(["pending", "completed", "rejected", "failed"]).default("pending"),
    /** The back-office user or API key that approved or rejected the request. */
    decided_by: model.text().nullable(),
    decided_at: model.dateTime().nullable(),
    completed_at: model.dateTime().nullable(),
    /** A fixed code, never an error message, which could quote personal data. */
    failure_code: model.text().nullable(),
  })
  .indexes([
    { on: ["customer_id"], where: "deleted_at IS NULL" },
    { on: ["status"], where: "deleted_at IS NULL" },
    {
      // A customer has at most one deletion waiting for the operator, even with concurrent requests.
      name: "IDX_privacy_request_one_pending_deletion",
      on: ["customer_id"],
      unique: true,
      where: "type = 'deletion' AND status = 'pending' AND deleted_at IS NULL",
    },
  ])

export default PrivacyRequest
