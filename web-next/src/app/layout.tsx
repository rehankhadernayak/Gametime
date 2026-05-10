import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { AppRootProviders } from "@/components/AppRootProviders";
import { baseMetadata } from "./metadata";
import "./globals.css";
import "@gametime/frontend/styles/app.css";
import shell from "./app-shell.module.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

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
    <html lang="en" className={`light ${plusJakartaSans.variable}`} data-theme="light">
      <body
        className={`${plusJakartaSans.className} ${GeistMono.variable} antialiased ${shell.appBody}`}
      >
        <AppRootProviders>{children}</AppRootProviders>
      </body>
    </html>
  );
}
