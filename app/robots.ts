import type { MetadataRoute } from "next";

// The public homepage is crawlable; the client platform is not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/calendar",
          "/campaigns",
          "/conversions",
          "/integrations",
          "/keywords",
          "/locations",
          "/reports",
          "/settings",
          "/welcome",
          "/api/",
        ],
      },
    ],
    sitemap: "https://madisonfour.com/sitemap.xml",
  };
}
