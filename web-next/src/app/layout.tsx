import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import "@gametime/frontend/styles/app.css";

function getMetadataBase(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    return new URL(explicit.endsWith("/") ? explicit : `${explicit}/`);
  }
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/\/$/, "");
    return new URL(`https://${host}/`);
  }
  return new URL("http://localhost:3000/");
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "Gametime — Level Up Your Chores";
const titleTemplate = `%s | Gametime — Level Up Your Chores`;
const defaultDescription =
  "Screen time, earned. Singapore family app for chores, homework, and gaming rewards.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: siteTitle,
    template: titleTemplate,
  },
  description: defaultDescription,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gametime",
  },
  icons: {
    icon: "/gametime-icon.svg",
    apple: "/gametime-icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_SG",
    siteName: "Gametime",
    title: siteTitle,
    description: defaultDescription,
    images: [
      {
        url: "/gametime-icon.svg",
        width: 512,
        height: 512,
        alt: "Gametime",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: defaultDescription,
    images: ["/gametime-icon.svg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
