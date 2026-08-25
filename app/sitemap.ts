import type { MetadataRoute } from "next";
import { COMPARISONS } from "@/lib/comparisons";
import { WORK } from "@/lib/work";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://madisonfour.com",
      changeFrequency: "monthly",
      priority: 1,
    },
    // The Test Kitchen case pages are the portfolio — indexable marketing
    // content, unlike the concept rooms themselves, which are noindex.
    // Driven from WORK so a new room lists itself.
    ...WORK.filter((w) => w.live).map((w) => ({
      url: `https://madisonfour.com/work/${w.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: "https://madisonfour.com/book",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Comparison pages double as ad landing pages and organic answers for
    // "[platform] alternative" searches.
    ...COMPARISONS.map((c) => ({
      url: `https://madisonfour.com/vs/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: "https://madisonfour.com/privacy", changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madisonfour.com/terms", changeFrequency: "yearly", priority: 0.2 },
  ];
}
