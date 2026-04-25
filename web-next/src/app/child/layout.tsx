import type { Viewport } from "next";

/**
 * Child dashboard is dark-first; pin the browser UI theme color so standalone / PWA
 * chrome matches the app even when the device prefers light mode.
 */
export const viewport: Viewport = {
  themeColor: "#09090B",
};

export default function ChildSegmentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
