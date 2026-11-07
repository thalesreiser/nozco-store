import type { StoreHomeAnnouncement, StoreHomeBanner, StoreHomeContent } from "@nozco/shared-types"

interface Displayable {
  id: string
  rank: number
  is_published: boolean
  starts_at: Date | string | null
  ends_at: Date | string | null
}

export type HomeBannerRow = Displayable & StoreHomeBanner
export type HomeAnnouncementRow = Displayable & StoreHomeAnnouncement

/** The window includes its start and excludes its end, so two consecutive items never overlap. */
export function isLive(item: Displayable, now: Date): boolean {
  if (!item.is_published) {
    return false
  }
  const started = !item.starts_at || new Date(item.starts_at) <= now
  const ended = !!item.ends_at && new Date(item.ends_at) <= now
  return started && !ended
}

/** By rank; the id settles a tie, so the order does not change between requests. */
function liveInOrder<T extends Displayable>(items: readonly T[], now: Date): T[] {
  return items
    .filter((item) => isLive(item, now))
    .sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : 1))
}

/** Field by field, so a column added later does not reach the store by accident. */
export function buildHomeContent(
  rows: { banners: readonly HomeBannerRow[]; announcements: readonly HomeAnnouncementRow[] },
  now: Date,
): StoreHomeContent {
  return {
    banners: liveInOrder(rows.banners, now).map((banner) => ({
      id: banner.id,
      title: banner.title,
      image_url: banner.image_url,
      image_alt: banner.image_alt,
      cta_label: banner.cta_label,
      cta_url: banner.cta_url,
    })),
    announcements: liveInOrder(rows.announcements, now).map((announcement) => ({
      id: announcement.id,
      message: announcement.message,
      link_url: announcement.link_url,
    })),
  }
}
