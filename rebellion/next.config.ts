import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Placeholder photography is served from Unsplash while the brand shoot
    // (blueprint §12, photography days 01–02) is produced. Swap the entries in
    // lib/images.ts for local files under /public/images and this can go.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
