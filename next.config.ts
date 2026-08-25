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
  async rewrites() {
    return {
      afterFiles: [
        {
          // Client spec builds are static exports dropped into
          // public/spec/<name>/. Next serves public files only on
          // exact match, so the bare folder URL needs pointing at its
          // own index.html; generic so the next spec needs no config.
          source: "/spec/:name",
          destination: "/spec/:name/index.html",
        },
        {
          // The same for routes inside a spec — /spec/orravan/team and
          // anything else the export produces as its own folder. These
          // rules run afterFiles, so a real asset underneath the spec
          // (an image, a _next chunk) is served directly and never
          // reaches this; only folder URLs fall through.
          source: "/spec/:name/:sub+",
          destination: "/spec/:name/:sub+/index.html",
        },
      ],
    };
  },
  async redirects() {
    return [
      // /book is now a real page with the scheduler embedded on-domain,
      // so the old external redirect is gone — printed links still work.
      {
        // This used to point at /proposals/hals, which is a different
        // client's quote entirely. Anyone at Orravan guessing their own
        // name in the URL would have been handed someone else's pricing.
        source: "/proposals/orravan",
        destination: "/proposals/orravan-redesign",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
