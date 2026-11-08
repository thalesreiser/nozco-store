import { z } from "zod"

export const PRIVACY_REQUEST_TYPES = ["export", "deletion"] as const
export const PRIVACY_REQUEST_STATUSES = ["pending", "completed", "rejected", "failed"] as const

export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number]
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number]

/**
 * Body of a data-subject request. Strict on purpose: the customer always comes from the session, so a
 * body that names one is refused instead of being silently ignored.
 */
export const privacyRequestPayloadSchema = z.strictObject({
  type: z.enum(PRIVACY_REQUEST_TYPES),
})

export type PrivacyRequestPayload = z.infer<typeof privacyRequestPayloadSchema>

export const PRIVACY_REJECTION_REASON_MAX_LENGTH = 500

/**
 * Body of a refusal. The customer reads the reason, and it stays in the request log after an
 * anonymisation, so operators must not type personal data in it. It is never logged.
 */
export const privacyRequestRejectionSchema = z.strictObject({
  reason: z.string().trim().min(1).max(PRIVACY_REJECTION_REASON_MAX_LENGTH),
})

export type PrivacyRequestRejection = z.infer<typeof privacyRequestRejectionSchema>

/** Query string of the back-office list. */
export const privacyRequestListQuerySchema = z.strictObject({
  type: z.enum(PRIVACY_REQUEST_TYPES).optional(),
  status: z.enum(PRIVACY_REQUEST_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export type PrivacyRequestListQuery = z.infer<typeof privacyRequestListQuerySchema>
