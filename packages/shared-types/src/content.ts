import { z } from "zod"

const HTTPS_URL = /^https:\/\/[^\s/?#\\]+\S*$/
/** One slash only: `//host` and `/\host` are other sites in a browser, not paths of this one. */
const SITE_PATH = /^\/(?![/\\])\S*$/

/** Refuses `javascript:`, `data:` and any other scheme that a link or an image would act on. */
const httpsUrl = z.string().trim().max(2048).regex(HTTPS_URL, "must be an https URL")

const linkTarget = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => SITE_PATH.test(value) || HTTPS_URL.test(value),
    "must be a path of this site or an https URL",
  )

const moment = z.iso.datetime({ offset: true }).transform((value) => new Date(value))

/** What the operator controls about when and where an item shows. Every field is always sent. */
const displayFields = {
  rank: z.number().int().min(0).max(9999),
  is_published: z.boolean(),
  starts_at: moment.nullable(),
  ends_at: moment.nullable(),
}

function windowIsOrdered(item: { starts_at: Date | null; ends_at: Date | null }) {
  return !item.starts_at || !item.ends_at || item.starts_at < item.ends_at
}
const windowError = { message: "starts_at must be before ends_at", path: ["starts_at"] }

/** Body that creates a banner or replaces one. The image is a URL; its alt text is required. */
export const homeBannerPayloadSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(120),
    image_url: httpsUrl,
    image_alt: z.string().trim().min(1).max(200),
    cta_label: z.string().trim().min(1).max(40).nullable(),
    cta_url: linkTarget.nullable(),
    ...displayFields,
  })
  .refine(windowIsOrdered, windowError)
  .refine((banner) => (banner.cta_label === null) === (banner.cta_url === null), {
    message: "cta_label and cta_url go together",
    path: ["cta_url"],
  })

export type HomeBannerPayload = z.infer<typeof homeBannerPayloadSchema>

/** Body that creates an announcement or replaces one. */
export const homeAnnouncementPayloadSchema = z
  .strictObject({
    message: z.string().trim().min(1).max(160),
    link_url: linkTarget.nullable(),
    ...displayFields,
  })
  .refine(windowIsOrdered, windowError)

export type HomeAnnouncementPayload = z.infer<typeof homeAnnouncementPayloadSchema>

/** Query string of a back-office list. */
export const contentListQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

/** `GET /store/content/home` takes no parameters. */
export const storeHomeContentRequestSchema = z.strictObject({})

export interface StoreHomeBanner {
  id: string
  title: string
  image_url: string
  image_alt: string
  cta_label: string | null
  cta_url: string | null
}

export interface StoreHomeAnnouncement {
  id: string
  message: string
  link_url: string | null
}

/** Only what is published and inside its dates, each list in display order. */
export interface StoreHomeContent {
  banners: StoreHomeBanner[]
  announcements: StoreHomeAnnouncement[]
}
