import { model } from "@medusajs/framework/utils"

/**
 * A banner of the home page. The store sees it only while published and inside its dates; no date means
 * no limit on that side. The image is a URL, because uploads wait for storage (EST-04.1). No workspace
 * imports here: `db:migrate` loads this file without building the packages.
 */
const HomeBanner = model.define("home_banner", {
  id: model.id({ prefix: "hbnr" }).primaryKey(),
  title: model.text(),
  image_url: model.text(),
  image_alt: model.text(),
  cta_label: model.text().nullable(),
  cta_url: model.text().nullable(),
  /** Lower shows first. */
  rank: model.number().default(0),
  is_published: model.boolean().default(false),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
})

export default HomeBanner
