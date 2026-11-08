import type { StoreHomeContent } from "@nozco/shared-types"
import { useDataSource } from "~/data"

const noContent = (): StoreHomeContent => ({ banners: [], announcements: [] })

/**
 * Banners and announcements (RF-01). The layout and the home page share this one call. A failed call
 * leaves both lists empty: the bar hides and the hero shows the store name.
 */
export function useHomeContent() {
  const { getHomeContent } = useDataSource().content
  return useAsyncData("home-content", getHomeContent, { default: noContent })
}
