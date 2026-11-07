import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { PrivacyRequestPayload } from "@nozco/shared-types"
import { customerView, type PrivacyRequestRow } from "../../../../../lib/privacy/requests"
import { collectCustomerExport, findCustomer } from "../../../../../lib/privacy/stores"
import { PRIVACY_REQUEST_MODULE } from "../../../../../modules/privacy-request"
import type PrivacyRequestModuleService from "../../../../../modules/privacy-request/service"
import { sendApiError } from "../../../../utils/api-error"

type CustomerRequest = AuthenticatedMedusaRequest<PrivacyRequestPayload>

function requestLog(req: AuthenticatedMedusaRequest<unknown>) {
  return req.scope.resolve<PrivacyRequestModuleService>(PRIVACY_REQUEST_MODULE)
}

async function pendingDeletion(
  log: PrivacyRequestModuleService,
  customerId: string,
): Promise<PrivacyRequestRow | undefined> {
  const [request] = await log.listPrivacyRequests({
    customer_id: customerId,
    type: "deletion",
    status: "pending",
  })
  return request
}

/** The export goes out in the answer and is stored nowhere, so the log never holds this data. */
async function runExport(
  req: CustomerRequest,
  res: MedusaResponse,
  customerId: string,
): Promise<void> {
  const log = requestLog(req)
  const request = await log.createPrivacyRequests({ customer_id: customerId, type: "export" })
  try {
    const data = await collectCustomerExport(
      {
        customers: req.scope.resolve(Modules.CUSTOMER),
        carts: req.scope.resolve(Modules.CART),
        orders: req.scope.resolve(Modules.ORDER),
      },
      customerId,
      new Date(),
    )
    const done = await log.updatePrivacyRequests({
      id: request.id,
      status: "completed",
      completed_at: new Date(),
    })
    res.setHeader("Cache-Control", "no-store")
    res.status(200).json({ request: customerView(done), export: data })
  } catch (error) {
    await log.updatePrivacyRequests({
      id: request.id,
      status: "failed",
      failure_code: "export_failed",
    })
    // The name only: a database error message can quote the values it was given.
    req.scope
      .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
      .error(`Privacy request ${request.id} failed: ${(error as Error).name}`)
    sendApiError(res, 500, { code: "export_failed", message: "The export could not be built." })
  }
}

/** Only records the request: nothing changes until an operator approves it. Asking twice is harmless. */
async function requestDeletion(
  req: CustomerRequest,
  res: MedusaResponse,
  customerId: string,
): Promise<void> {
  const log = requestLog(req)
  const existing = await pendingDeletion(log, customerId)
  if (existing) {
    res.status(200).json({ request: customerView(existing) })
    return
  }
  try {
    const created = await log.createPrivacyRequests({ customer_id: customerId, type: "deletion" })
    res.status(202).json({ request: customerView(created) })
  } catch (error) {
    // A concurrent request won the unique index.
    const winner = await pendingDeletion(log, customerId)
    if (!winner) {
      throw error
    }
    res.status(200).json({ request: customerView(winner) })
  }
}

/** The customer comes from the session and from nowhere else, so nobody can name another one. */
export async function POST(req: CustomerRequest, res: MedusaResponse): Promise<void> {
  const customerId = req.auth_context.actor_id
  // A token issued before the anonymisation stays valid until it expires.
  if (!(await findCustomer(req.scope.resolve(Modules.CUSTOMER), customerId))) {
    sendApiError(res, 404, { code: "customer_not_found", message: "The customer does not exist." })
    return
  }
  if (req.validatedBody.type === "export") {
    await runExport(req, res, customerId)
    return
  }
  await requestDeletion(req, res, customerId)
}

/** The customer's own requests, newest first. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const requests = await requestLog(req).listPrivacyRequests(
    { customer_id: req.auth_context.actor_id },
    { order: { created_at: "DESC" }, take: 100 },
  )
  res.status(200).json({ requests: requests.map(customerView) })
}
