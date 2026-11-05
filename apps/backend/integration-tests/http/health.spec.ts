import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe("uptime checks", () => {
      it("answers GET /health", async () => {
        const response = (await api.get("/health")) as { status: number; data: unknown }

        expect(response.status).toBe(200)
        expect(response.data).toBe("OK")
      })

      // The runner registers its own /health, as `medusa start` does, so that route alone does
      // not show the application loaded. A protected Medusa route does.
      it("serves Medusa's own routes", async () => {
        const response = (await api.get("/admin/users", { validateStatus: () => true })) as {
          status: number
        }

        expect(response.status).toBe(401)
      })
    })
  },
})
