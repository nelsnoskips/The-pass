import { notFound } from "next/navigation";
import { SiteShell } from "@/components/sites/SiteShell";
import { db } from "@/lib/db";
import { getOrderingSettings } from "@/lib/ordering";
import { getPublishedSite } from "@/lib/sites/repo";
import "../../sites.css";

// Content is per-restaurant and changes on publish.
export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ site: string }>;
}) {
  const { site: slug } = await params;
  const sql = db();
  const site = sql ? await getPublishedSite(sql, slug) : null;
  if (!site || !sql) notFound();
  const ordering = await getOrderingSettings(sql, site.orgId);
  return <SiteShell content={site.content} base={`/s/${site.slug}`} ordering={ordering.pickupEnabled || ordering.cateringEnabled}>{children}</SiteShell>;
}
