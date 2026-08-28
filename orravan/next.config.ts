import type { NextConfig } from "next";
import path from "path";

/**
 * The mock builds as a fully static bundle so it can be hosted the way
 * the studio hosts every mock for client review: exported once, dropped
 * under a path, no server.
 *
 * MOCK_BASE sets that path at build time, e.g.
 *   MOCK_BASE=/spec/orravan-thread npm run build
 * writes an `out/` whose assets all resolve under /spec/orravan-thread.
 */
const base = process.env.MOCK_BASE ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: base,
  env: { NEXT_PUBLIC_BASE_PATH: base },
  // The repo's root lockfile makes Next infer the workspace root one
  // level up, which drags the studio app's middleware into this build.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
