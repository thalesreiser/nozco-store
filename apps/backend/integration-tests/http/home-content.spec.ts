import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import type { StoreHomeContent } from "@nozco/shared-types"
import { CONTENT_MODULE } from "../../src/modules/content"
import type ContentModuleService from "../../src/modules/content/service"

jest.setTimeout(180 * 1000)

const STORE_ROUTE = "/store/content/home"
const BANNERS = "/admin/content/banners"
const ANNOUNCEMENTS = "/admin/content/announcements"
const hour = 60 * 60 * 1000

type Headers = Record<string, string>
interface Body extends StoreHomeContent {
  code: string
  message: string
  banner: { id: string; title: string; is_published: boolean; ends_at: string | null }
  announcement: { id: string; message: string }
  count: number
}
interface Answer {
  status: number
  data: Body
}
interface Config {
  headers?: Headers
  validateStatus: () => boolean
}
interface Api {
  get(url: string, config: Config): Promise<Answer>
  post(url: string, body: unknown, config: Config): Promise<Answer>
  delete(url: string, config: Config): Promise<Answer>
}

const validateStatus = () => true

const bannerBody = {
  title: "Coleção de exemplo",
  image_url: "https://cdn.example.com/banner.jpg",
  image_alt: "Camiseta preta de exemplo",
  cta_label: "Ver coleção",
  cta_url: "/colecoes/exemplo",
  rank: 0,
  is_published: true,
  starts_at: null,
  ends_at: null,
}
const announcementBody = {
  message: "Aviso de exemplo",
  link_url: "/frete",
  rank: 0,
  is_published: true,
  starts_at: null,
  ends_at: null,
}

medusaIntegrationTestRunner({
  testSuite: ({ api: untypedApi, getContainer }) => {
    const api = untypedApi as Api
    let store: Headers
    let operator: Headers
    let content: ContentModuleService

    beforeEach(async () => {
      const container: MedusaContainer = getContainer()
      content = container.resolve<ContentModuleService>(CONTENT_MODULE)
      const keys = container.resolve(Modules.API_KEY)
      const key = await keys.createApiKeys({
        title: "Integration test",
        type: "publishable",
        created_by: "integration-test",
      })
      store = { "x-publishable-api-key": key.token }
      const secret = await keys.createApiKeys({
        title: "Integration test operator",
        type: "secret",
        created_by: "integration-test",
      })
      operator = { authorization: `Basic ${Buffer.from(`${secret.token}:`).toString("base64")}` }
    })

    const createBanner = async (change: object) => {
      const answer = await api.post(
        BANNERS,
        { ...bannerBody, ...change },
        { headers: operator, validateStatus },
      )
      expect(answer.status).toBe(201)
      return answer.data.banner
    }

    describe(STORE_ROUTE, () => {
      it("returns only live content, in order, with public fields only", async () => {
        const now = Date.now()
        const second = await createBanner({ title: "Segundo", rank: 2 })
        const first = await createBanner({ title: "Primeiro", rank: 1 })
        await createBanner({ title: "Rascunho", is_published: false })
        await createBanner({
          title: "Encerrado",
          starts_at: new Date(now - 2 * hour).toISOString(),
          ends_at: new Date(now - hour).toISOString(),
        })
        await createBanner({ title: "Futuro", starts_at: new Date(now + hour).toISOString() })
        await api.post(ANNOUNCEMENTS, announcementBody, { headers: operator, validateStatus })

        const answer = await api.get(STORE_ROUTE, { headers: store, validateStatus })

        expect(answer.status).toBe(200)
        expect(answer.data.banners.map(({ id }) => id)).toEqual([first.id, second.id])
        expect(Object.keys(answer.data.banners[0] ?? {}).sort()).toEqual([
          "cta_label",
          "cta_url",
          "id",
          "image_alt",
          "image_url",
          "title",
        ])
        expect(answer.data.announcements).toEqual([
          expect.objectContaining({ message: "Aviso de exemplo", link_url: "/frete" }),
        ])
        expect(Object.keys(answer.data.announcements[0] ?? {}).sort()).toEqual([
          "id",
          "link_url",
          "message",
        ])
      })

      it("answers empty lists when nothing is published", async () => {
        const answer = await api.get(STORE_ROUTE, { headers: store, validateStatus })
        expect(answer.status).toBe(200)
        expect(answer.data).toEqual({ banners: [], announcements: [] })
      })

      it("needs the publishable key and refuses unknown parameters", async () => {
        const noKey = await api.get(STORE_ROUTE, { validateStatus })
        expect(noKey.status).toBe(400)
        const unknown = await api.get(`${STORE_ROUTE}?preview=1`, {
          headers: store,
          validateStatus,
        })
        expect(unknown.status).toBe(400)
        expect(unknown.data.code).toBe("invalid_payload")
      })
    })

    describe("back office", () => {
      it("refuses a request without a session", async () => {
        for (const path of [BANNERS, ANNOUNCEMENTS]) {
          expect((await api.get(path, { validateStatus })).status).toBe(401)
          expect((await api.post(path, {}, { validateStatus })).status).toBe(401)
        }
        expect((await api.delete(`${BANNERS}/any`, { validateStatus })).status).toBe(401)
      })

      it("refuses a banner without alt text with { code, message }", async () => {
        const answer = await api.post(
          BANNERS,
          { ...bannerBody, image_alt: "" },
          { headers: operator, validateStatus },
        )
        expect(answer.status).toBe(400)
        expect(answer.data.code).toBe("invalid_payload")
        expect(answer.data.message).toContain("image_alt")
        expect((await content.listHomeBanners({})).length).toBe(0)
      })

      it("creates, replaces, lists drafts and removes a banner", async () => {
        const banner = await createBanner({ is_published: false })
        const path = `${BANNERS}/${banner.id}`

        const replaced = await api.post(
          path,
          { ...bannerBody, title: "Novo título", ends_at: "2030-01-01T00:00:00Z" },
          { headers: operator, validateStatus },
        )
        expect(replaced.status).toBe(200)
        expect(replaced.data.banner).toMatchObject({ title: "Novo título", is_published: true })
        expect(new Date(replaced.data.banner.ends_at ?? 0).toISOString()).toBe(
          "2030-01-01T00:00:00.000Z",
        )

        const listed = await api.get(BANNERS, { headers: operator, validateStatus })
        expect(listed.data.count).toBe(1)

        const removed = await api.delete(path, { headers: operator, validateStatus })
        expect(removed.status).toBe(200)
        expect(
          (await api.get(STORE_ROUTE, { headers: store, validateStatus })).data.banners,
        ).toEqual([])
      })

      it("answers 404 for a banner or announcement that does not exist", async () => {
        const config = { headers: operator, validateStatus }
        const banner = await api.post(`${BANNERS}/missing`, bannerBody, config)
        expect(banner.status).toBe(404)
        expect(banner.data.code).toBe("not_found")
        const announcement = await api.delete(`${ANNOUNCEMENTS}/missing`, config)
        expect(announcement.status).toBe(404)
        expect(announcement.data.code).toBe("not_found")
      })

      it("manages an announcement", async () => {
        const config = { headers: operator, validateStatus }
        const created = await api.post(ANNOUNCEMENTS, announcementBody, config)
        expect(created.status).toBe(201)
        const path = `${ANNOUNCEMENTS}/${created.data.announcement.id}`
        const replaced = await api.post(path, { ...announcementBody, message: "Outro" }, config)
        expect(replaced.data.announcement.message).toBe("Outro")
        expect((await api.delete(path, config)).status).toBe(200)
        expect((await api.get(STORE_ROUTE, { headers: store, validateStatus })).data).toEqual({
          banners: [],
          announcements: [],
        })
      })
    })
  },
})
