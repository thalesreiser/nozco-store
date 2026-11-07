// Store details that must not live in a public repository. They arrive as NUXT_PUBLIC_* text, and a
// missing one yields nothing, so the interface hides that element instead of linking nowhere.

export interface SocialLink {
  name: string
  url: string
}

/** Reads `Name|https://url,Name|https://url`. Anything else is dropped, so no other scheme gets out. */
export function parseSocialLinks(raw: string): SocialLink[] {
  return parseList(raw).flatMap((entry) => {
    const [name, url, ...rest] = entry.split("|").map((part) => part.trim())
    return name && url && rest.length === 0 && isHttpsUrl(url) ? [{ name, url }] : []
  })
}

export function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** The number holds digits only, with the country code. Returns null when there is no valid number. */
export function whatsAppUrl(number: string): string | null {
  return /^\d{10,15}$/.test(number) ? `https://wa.me/${number}` : null
}

/** True when every entry of the list is a well-formed social link. */
export function isSocialLinkList(raw: string): boolean {
  return parseSocialLinks(raw).length === parseList(raw).length
}

function isHttpsUrl(value: string): boolean {
  return URL.canParse(value) && new URL(value).protocol === "https:"
}
