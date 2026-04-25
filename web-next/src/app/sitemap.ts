import type { MetadataRoute } from "next";
import { getGametimeSiteUrl } from "./metadata";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[0]["changeFrequency"]>;

/** Public marketing and auth entry routes (same paths as unauthenticated navigation). */
const staticPaths: { path: string; priority: number; changeFrequency: ChangeFrequency }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/login", priority: 0.9, changeFrequency: "monthly" },
  { path: "/signup", priority: 0.9, changeFrequency: "monthly" },
  { path: "/forgot-password", priority: 0.7, changeFrequency: "yearly" },
  { path: "/reset-password", priority: 0.5, changeFrequency: "yearly" },
  { path: "/child-login", priority: 0.8, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getGametimeSiteUrl();
  const now = new Date();

  return staticPaths.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
