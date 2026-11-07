import { buildHomeContent, type HomeAnnouncementRow, type HomeBannerRow, isLive } from "../home"

const now = new Date("2026-11-07T12:00:00Z")
const before = "2026-11-07T11:00:00Z"
const after = "2026-11-07T13:00:00Z"

const display = { rank: 0, is_published: true, starts_at: null, ends_at: null }

function banner(id: string, change: Partial<HomeBannerRow> = {}): HomeBannerRow {
  return {
    id,
    title: `Banner ${id}`,
    image_url: "https://cdn.example.com/a.jpg",
    image_alt: "Imagem de exemplo",
    cta_label: null,
    cta_url: null,
    ...display,
    ...change,
  }
}

function announcement(id: string, change: Partial<HomeAnnouncementRow> = {}): HomeAnnouncementRow {
  return { id, message: `Aviso ${id}`, link_url: null, ...display, ...change }
}

describe("isLive", () => {
  it("hides a draft, even inside its dates", () => {
    expect(isLive({ id: "a", ...display, is_published: false }, now)).toBe(false)
  })

  it.each([
    ["no dates", null, null, true],
    ["started", before, null, true],
    ["not started", after, null, false],
    ["not ended", null, after, true],
    ["ended", null, before, false],
    ["inside its window", before, after, true],
    ["starting right now", now.toISOString(), null, true],
    ["ending right now", null, now.toISOString(), false],
  ])("%s", (_name, starts_at, ends_at, expected) => {
    expect(isLive({ id: "a", ...display, starts_at, ends_at }, now)).toBe(expected)
  })

  it("reads dates as Date values, as the module returns them", () => {
    expect(isLive({ id: "a", ...display, ends_at: new Date(before) }, now)).toBe(false)
  })
})

describe("buildHomeContent", () => {
  it("keeps only what is live, by rank, with ties settled by id", () => {
    const { banners, announcements } = buildHomeContent(
      {
        banners: [
          banner("c", { rank: 2 }),
          banner("b", { rank: 1 }),
          banner("a", { rank: 1 }),
          banner("draft", { is_published: false }),
          banner("over", { ends_at: before }),
        ],
        announcements: [
          announcement("later", { starts_at: after }),
          announcement("y", { rank: 5 }),
          announcement("x", { rank: 1 }),
        ],
      },
      now,
    )
    expect(banners.map(({ id }) => id)).toEqual(["a", "b", "c"])
    expect(announcements.map(({ id }) => id)).toEqual(["x", "y"])
  })

  it("does not change the lists it receives", () => {
    const rows = [banner("b", { rank: 1 }), banner("a", { rank: 0 })]
    buildHomeContent({ banners: rows, announcements: [] }, now)
    expect(rows.map(({ id }) => id)).toEqual(["b", "a"])
  })

  it("returns only the fields of the store contract", () => {
    const extra = { created_at: "x", deleted_at: null, metadata: { note: "interna" } }
    const { banners, announcements } = buildHomeContent(
      {
        banners: [banner("a", { cta_label: "Ver", cta_url: "/c", ...extra })],
        announcements: [announcement("b", { link_url: "/frete", ...extra })],
      },
      now,
    )
    expect(banners).toEqual([
      {
        id: "a",
        title: "Banner a",
        image_url: "https://cdn.example.com/a.jpg",
        image_alt: "Imagem de exemplo",
        cta_label: "Ver",
        cta_url: "/c",
      },
    ])
    expect(announcements).toEqual([{ id: "b", message: "Aviso b", link_url: "/frete" }])
  })

  it("answers empty lists when there is no content", () => {
    expect(buildHomeContent({ banners: [], announcements: [] }, now)).toEqual({
      banners: [],
      announcements: [],
    })
  })
})
