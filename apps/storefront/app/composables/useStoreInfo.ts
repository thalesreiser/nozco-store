import { parseList, parseSocialLinks, whatsAppUrl } from "#shared/store-info"
import type { SocialLink } from "#shared/store-info"

export interface StoreInfo {
  whatsAppUrl: string | null
  legalName: string
  cnpj: string
  legalAddress: string
  contactEmail: string
  socialLinks: SocialLink[]
  paymentMethods: string[]
}

export function useStoreInfo(): StoreInfo {
  const config = useRuntimeConfig().public
  // Nuxt turns a numeric environment variable into a number, so these are read back as text.
  return {
    whatsAppUrl: whatsAppUrl(String(config.whatsappNumber)),
    legalName: String(config.legalName),
    cnpj: String(config.cnpj),
    legalAddress: String(config.legalAddress),
    contactEmail: String(config.contactEmail),
    socialLinks: parseSocialLinks(String(config.socialLinks)),
    paymentMethods: parseList(String(config.paymentMethods)),
  }
}
