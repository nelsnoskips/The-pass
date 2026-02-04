import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use current directory as project root when running from aesthetix (separate from parent workspace)
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
