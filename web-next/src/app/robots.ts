import type { MetadataRoute } from "next";
import { getGametimeSiteUrl } from "./metadata";

export default function robots(): MetadataRoute.Robots {
  const base = getGametimeSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/parent/", "/child/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
