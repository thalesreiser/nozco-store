import { z } from "zod"

// RF-19: without consent the form is invalid, so an e-mail can never go further than this check.
export const newsletterSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)),
  consent: z.literal(true),
})

export type NewsletterData = z.infer<typeof newsletterSchema>
