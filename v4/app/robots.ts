import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** The review mock stays out of search; orravan.ai is open to it. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.MOCK_BASE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://orravan.ai/sitemap.xml",
  };
}
