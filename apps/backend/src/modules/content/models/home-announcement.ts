import { model } from "@medusajs/framework/utils"

/**
 * A message of the announcement bar, with the same display rules as a banner. No workspace imports here:
 * `db:migrate` loads this file without building the packages.
 */
const HomeAnnouncement = model.define("home_announcement", {
  id: model.id({ prefix: "hann" }).primaryKey(),
  message: model.text(),
  link_url: model.text().nullable(),
  /** Lower shows first. */
  rank: model.number().default(0),
  is_published: model.boolean().default(false),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
})

export default HomeAnnouncement
