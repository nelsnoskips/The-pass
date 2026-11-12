import { includes, planFor } from "@/lib/billing/entitlements";
import { notFound } from "next/navigation";
import { BackToApp } from "@/components/app/BackToApp";
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
  const [ordering, plan] = await Promise.all([getOrderingSettings(sql, site.orgId), planFor(sql, site.orgId)]);
  // Only what the restaurant's plan includes is linked: no dead links.
  const orderingOpen = (includes(plan, "ordering") && ordering.pickupEnabled) || (includes(plan, "catering") && ordering.cateringEnabled);
  return (
    <SiteShell content={site.content} base={`/s/${site.slug}`} ordering={orderingOpen} giftCards={includes(plan, "gift_cards")}
      giftCardsOnline={Boolean(process.env.STRIPE_SECRET_KEY?.trim())}
      banner={includes(plan, "app") ? <BackToApp base={`/s/${site.slug}`} /> : null}>
      {children}
    </SiteShell>
  );
}
