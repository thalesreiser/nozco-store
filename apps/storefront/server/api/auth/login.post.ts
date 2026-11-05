import { loginBodySchema } from "#shared/schemas/bff"
import { z } from "zod"
import { apiError, isApiError, parseInput } from "../../utils/api-error"
import { medusa } from "../../utils/medusa"
import { setSessionToken } from "../../utils/session"

const tokenResponse = z.object({ token: z.string().min(1) }).transform((value) => value.token)

export default defineEventHandler(async (event) => {
  const body = parseInput(loginBodySchema, await readBody(event))
  try {
    const token = await medusa(event, "/auth/customer/emailpass", tokenResponse, {
      method: "POST",
      body,
      useSession: false,
    })
    setSessionToken(event, token)
  } catch (error) {
    if (isApiError(error, "unauthorized")) {
      throw apiError(401, { code: "invalid_credentials", message: "Invalid e-mail or password." })
    }
    throw error
  }
  return { authenticated: true }
})
