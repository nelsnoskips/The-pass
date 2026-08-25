import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use current directory as project root when running from aesthetix (separate from parent workspace)
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Food and paper stock carry visible grain, so they are served above
    // the default 75. Next only honours qualities declared here.
    qualities: [75, 82, 84, 86, 88, 90],
  },
  async redirects() {
    return [
      {
        // Outreach and print materials link madisonfour.com/book; the
        // scheduler behind it can change without reprinting anything.
        source: "/book",
        destination: "https://cal.com/the-pass-team-ht7tto/book",
        permanent: false,
      },
      {
        // Renamed before it was ever sent out, but the old path was
        // live and verified for a few minutes — worth a redirect
        // rather than trusting nobody bookmarked it.
        source: "/proposals/orravan",
        destination: "/proposals/hals",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
