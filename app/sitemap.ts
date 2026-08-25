import type { MetadataRoute } from "next";
import { COMPARISONS } from "@/lib/comparisons";
import { WORK } from "@/lib/work";

export default function sitemap(): MetadataRoute.Sitemap {
  /* Stamped at build time rather than per request. The pages are
     static, so "when this was last deployed" is the honest answer to
     when they last changed — and a date that moves on every crawl
     teaches Google to ignore the field. */
  const built = new Date();
  return [
    {
      url: "https://madisonfour.com",
      lastModified: built,
      changeFrequency: "monthly",
      priority: 1,
    },
    // The Test Kitchen case pages are the portfolio — indexable marketing
    // content, unlike the concept rooms themselves, which are noindex.
    // Driven from WORK so a new room lists itself.
    ...WORK.filter((w) => w.live).map((w) => ({
      url: `https://madisonfour.com/work/${w.slug}`,
      lastModified: built,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // The intake is a real destination, not just a form the nav hides.
    { url: "https://madisonfour.com/brief", lastModified: built, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://madisonfour.com/book", lastModified: built, changeFrequency: "monthly", priority: 0.8 },
    // Comparison pages double as ad landing pages and organic answers for
    // "[platform] alternative" searches.
    ...COMPARISONS.map((c) => ({
      url: `https://madisonfour.com/vs/${c.slug}`,
      lastModified: built,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: "https://madisonfour.com/privacy", lastModified: built, changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madisonfour.com/terms", lastModified: built, changeFrequency: "yearly", priority: 0.2 },
  ];
}
