import { MedusaService } from "@medusajs/framework/utils"
import HomeAnnouncement from "./models/home-announcement"
import HomeBanner from "./models/home-banner"

export default class ContentModuleService extends MedusaService({
  HomeBanner,
  HomeAnnouncement,
}) {}
