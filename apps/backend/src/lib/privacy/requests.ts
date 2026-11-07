import type { PrivacyRequestStatus, PrivacyRequestType } from "@nozco/shared-types"

export interface PrivacyRequestRow {
  id: string
  customer_id: string
  type: PrivacyRequestType
  status: PrivacyRequestStatus
  decided_by?: string | null
  decided_at?: string | Date | null
  completed_at?: string | Date | null
  failure_code?: string | null
  created_at?: string | Date | null
}

export type ReviewAction = "approve" | "reject"

/**
 * Only a deletion waits for the operator. A failed one can be approved again but not rejected, since
 * part of the data may already be gone. Returns the refusal, or null when the action may go ahead.
 */
export function reviewRefusal(
  request: Pick<PrivacyRequestRow, "type" | "status">,
  action: ReviewAction,
): { code: string; message: string } | null {
  if (request.type !== "deletion") {
    return { code: "request_not_reviewable", message: "Only deletion requests need a decision." }
  }
  const allowed =
    request.status === "pending" || (action === "approve" && request.status === "failed")
  return allowed
    ? null
    : { code: "request_already_decided", message: "The request was already decided." }
}

/** What a customer sees of their own request: the operator's identity stays in the back office. */
export function customerView(request: PrivacyRequestRow) {
  return {
    id: request.id,
    type: request.type,
    status: request.status,
    created_at: request.created_at ?? null,
    completed_at: request.completed_at ?? null,
  }
}

export function adminView(request: PrivacyRequestRow) {
  return {
    ...customerView(request),
    customer_id: request.customer_id,
    decided_by: request.decided_by ?? null,
    decided_at: request.decided_at ?? null,
    failure_code: request.failure_code ?? null,
  }
}
