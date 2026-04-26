import type { NextConfig } from "next";
import path from "node:path";

const navShim = path.resolve(__dirname, "../frontend/src/shims/nav.next.jsx");
const frontendSrc = path.resolve(__dirname, "../frontend/src");

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
