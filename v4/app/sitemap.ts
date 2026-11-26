import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const PAGES = [
  "/",
  "/about",
  "/services",
  "/services/building-automation",
  "/services/hvac",
  "/services/support",
  "/inventory",
  "/team",
  "/request-quote",
  "/contact",
];

/** Every public page, at the address it will have on orravan.ai. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `https://orravan.ai${path === "/" ? "" : path}` }));
}
