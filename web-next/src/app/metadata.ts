import type { Metadata } from "next";

/** Canonical site URL for metadataBase, Open Graph, sitemap, and robots. */
export function getGametimeSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

const siteUrl = getGametimeSiteUrl();
const siteOrigin = new URL(siteUrl);

const defaultDescription =
  "Screen time, earned. Singapore family app for chores, homework, and gaming rewards.";

const ogImage = "/icon-512.png";

/**
 * Centralized SEO and PWA metadata. Import into the root `layout.tsx` (and optionally
 * override `title` in route segments via `generateMetadata` or local `metadata` exports).
 */
export const baseMetadata: Metadata = {
  metadataBase: siteOrigin,
  title: {
    default: "Gametime — Level Up Your Chores",
    template: "%s | Gametime — Level Up Your Chores",
  },
  description: defaultDescription,
  applicationName: "Gametime",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Gametime",
    statusBarStyle: "black-translucent",
    startupImage: [
      {
        url: "/apple-splash-1290x2796.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/apple-splash-1170x2532.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/apple-splash-2048x2732.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "1024x1024", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_SG",
    url: siteOrigin,
    siteName: "Gametime",
    title: "Gametime — Level Up Your Chores",
    description: defaultDescription,
    images: [
      {
        url: ogImage,
        width: 512,
        height: 512,
        alt: "Gametime",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gametime — Level Up Your Chores",
    description: defaultDescription,
    images: [ogImage],
  },
};
