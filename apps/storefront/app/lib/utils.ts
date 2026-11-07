import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The semantic names of tokens.css. Without them tailwind-merge reads text-lead as a text colour and
// font-heavy as a font family, and cn("text-lead text-foreground") drops the size.
// tests/design/tailwind.test.ts keeps this list equal to the token file.
export const semanticThemeNames = {
  text: ["display", "heading", "lead", "body", "action", "note", "tag"],
  "font-weight": ["regular", "emphasis", "action", "heavy"],
  tracking: ["label"],
  spacing: ["page", "hero", "section", "inline", "grid", "stack", "touch"],
  radius: ["control", "surface"],
  shadow: ["overlay"],
}

const twMerge = extendTailwindMerge({ extend: { theme: semanticThemeNames } })

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
