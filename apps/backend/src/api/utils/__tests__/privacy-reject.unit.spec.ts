import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { PrivacyRequestRejection } from "@nozco/shared-types"
import { POST } from "../../admin/privacy-requests/[id]/reject/route"
import { PRIVACY_REQUEST_MODULE } from "../../../modules/privacy-request"

const REASON = "Motivo de exemplo"

function setup(update: jest.Mock) {
  const error = jest.fn()
  const services: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: { error },
    [PRIVACY_REQUEST_MODULE]: {
      listPrivacyRequests: jest
        .fn()
        .mockResolvedValue([{ id: "pvreq_1", type: "deletion", status: "pending" }]),
      updatePrivacyRequests: update,
    },
  }
  const req = {
    params: { id: "pvreq_1" },
    auth_context: { actor_id: "user_1" },
    validatedBody: { reason: REASON },
    scope: { resolve: (name: string) => services[name] },
  } as unknown as AuthenticatedMedusaRequest<PrivacyRequestRejection>
  const json = jest.fn()
  const status = jest.fn(() => ({ json }))
  return { req, res: { status } as unknown as MedusaResponse, error, status, json }
}

describe("POST /admin/privacy-requests/:id/reject", () => {
  it("stores the reason with the decision", async () => {
    const update = jest.fn((row: object) => Promise.resolve(row))
    const { req, res, status } = setup(update)

    await POST(req, res)

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected", rejection_reason: REASON }),
    )
    expect(status).toHaveBeenCalledWith(200)
  })

  it("logs the error's name only, because a database message can quote the reason", async () => {
    const update = jest.fn(() => Promise.reject(new TypeError(`update set reason = '${REASON}'`)))
    const { req, res, error, status, json } = setup(update)

    await POST(req, res)

    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: "rejection_failed" }))
    expect(error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify([error.mock.calls, json.mock.calls])).not.toContain(REASON)
  })
})
