// Answers of these routes are personal, so no browser or Cloudflare cache may keep them.
export default defineEventHandler((event) => {
  if (event.path.startsWith("/api/")) setResponseHeader(event, "cache-control", "no-store")
})
