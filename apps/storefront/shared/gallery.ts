// The internal component gallery exists only where the fictional fixtures may exist.
import { isMockAllowedIn } from "./data-source"

export const GALLERY_PATH = "/_componentes"

/** Unique string that lets scripts/check-fixtures.mjs prove the page is out of a production build. */
export const GALLERY_MARKER = "nozco-component-gallery-2c81e4"

export function isGalleryAllowedIn(appEnv: string | undefined): boolean {
  return isMockAllowedIn(appEnv)
}
