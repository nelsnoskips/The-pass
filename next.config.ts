import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use current directory as project root when running from aesthetix (separate from parent workspace)
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Food and paper stock carry visible grain, so they are served above
    // the default 75. Next only honours qualities declared here.
    qualities: [75, 82, 84, 86, 88],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
