import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Matches Vite dev proxy: browser calls `/api/*`, backend mounts at `/*` (no /api prefix).
    return [{ source: "/api/:path*", destination: "http://localhost:4000/:path*" }];
  },
};

export default nextConfig;
