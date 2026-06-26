import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/home", "/onboarding", "/workout", "/profile", "/analytics"],
    },
    sitemap: "https://rokhdad.app/sitemap.xml",
  }
}