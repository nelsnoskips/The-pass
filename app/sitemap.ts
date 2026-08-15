import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://madisonfour.com",
      changeFrequency: "monthly",
      priority: 1,
    },
    { url: "https://madisonfour.com/privacy", changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madisonfour.com/terms", changeFrequency: "yearly", priority: 0.2 },
  ];
}
