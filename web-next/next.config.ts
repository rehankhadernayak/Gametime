import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

/** Vercel CLI uploads only `web-next/`; sync `../frontend` into `./frontend` before deploy (see push-vercel-production.mjs). */
const bundledFrontendSrc = path.join(__dirname, "frontend", "src");
const monorepoFrontendSrc = path.resolve(__dirname, "../frontend/src");
const frontendSrc = fs.existsSync(bundledFrontendSrc) ? bundledFrontendSrc : monorepoFrontendSrc;
const navShim = path.join(frontendSrc, "shims", "nav.next.jsx");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: __dirname,
    resolveAlias: {
      "gametime-web-nav": navShim,
      "@gametime/frontend": frontendSrc,
    },
  },
  async rewrites() {
    const target = (process.env.API_PROXY_TARGET || "http://127.0.0.1:4000").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${target}/:path*` }];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "gametime-web-nav": navShim,
      "@gametime/frontend": frontendSrc,
    };
    return config;
  },
};

export default nextConfig;
