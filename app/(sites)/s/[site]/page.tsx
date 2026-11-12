import { includes, planFor } from "@/lib/billing/entitlements";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteHome } from "@/components/sites/SiteHome";
import { getOrderingSettings } from "@/lib/ordering";
import { getPublishedSite } from "@/lib/sites/repo";

type Params = { params: Promise<{ site: string }> };

async function load(params: Params["params"]) {
  const { site: slug } = await params;
  const sql = db();
  return sql ? getPublishedSite(sql, slug) : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const site = await load(params);
  if (!site) return {};
  const { brand, hero } = site.content;
  const title = brand.tagline ? `${brand.name} | ${brand.tagline}` : brand.name;
  return {
    title,
    description: hero.sub || brand.tagline,
    alternates: { canonical: `/s/${site.slug}` },
    openGraph: { title, description: hero.sub || brand.tagline, type: "website", images: hero.image ? [hero.image] : [] },
  };
}

export default async function SitePage({ params }: Params) {
  const site = await load(params);
  if (!site) notFound();
  const sql = db();
  const [o, plan] = sql ? await Promise.all([getOrderingSettings(sql, site.orgId), planFor(sql, site.orgId)]) : [null, null];
  const pickup = Boolean(o?.pickupEnabled && plan && includes(plan, "ordering"));
  const catering = Boolean(o?.cateringEnabled && plan && includes(plan, "catering"));
  const ordering = pickup ? "pickup" : catering ? "catering" : false;
  return <SiteHome content={site.content} base={`/s/${site.slug}`} ordering={ordering} />;
}
