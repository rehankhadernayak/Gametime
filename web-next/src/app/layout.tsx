import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import { PageTransitionShell } from "@/components/PageTransitionShell";
import { baseMetadata } from "./metadata";
import "./globals.css";
import "@gametime/frontend/styles/app.css";
import shell from "./app-shell.module.css";

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAFAFA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" data-theme="light">
      <body
        className={`${GeistSans.className} ${GeistSans.variable} ${GeistMono.variable} antialiased ${shell.appBody}`}
      >
        <Providers>
          <PageTransitionShell>{children}</PageTransitionShell>
        </Providers>
      </body>
    </html>
  );
}
