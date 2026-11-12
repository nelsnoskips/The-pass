import { includes, planFor } from "@/lib/billing/entitlements";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderBuilder, type ReadyOption } from "@/components/sites/OrderBuilder";
import { db } from "@/lib/db";
import { hasAutomaticPromotions } from "@/lib/marketing/promotions";
import { getOrderingSettings, orderableItems, readyTimes, venuePeriods } from "@/lib/ordering";
import { getPublishedSite } from "@/lib/sites/repo";

type Params = { params: Promise<{ site: string }>; searchParams: Promise<{ cancelled?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { site: slug } = await params;
  const sql = db();
  const site = sql ? await getPublishedSite(sql, slug) : null;
  return site ? { title: `Order online | ${site.content.brand.name}`, alternates: { canonical: `/s/${site.slug}/order` } } : {};
}

export default async function Order({ params, searchParams }: Params) {
  const { site: slug } = await params;
  const { cancelled } = await searchParams;
  const sql = db();
  const site = sql ? await getPublishedSite(sql, slug) : null;
  if (!site || !sql) notFound();
  // Not in the restaurant's plan: there is no order page.
  const plan = await planFor(sql, site.orgId);
  if (!includes(plan, "ordering") && !includes(plan, "catering")) notFound();
  const settings = await getOrderingSettings(sql, site.orgId);
  const kinds = [...(settings.pickupEnabled ? ["pickup" as const] : []), ...(settings.cateringEnabled ? ["catering" as const] : [])];
  const items = [...orderableItems(site.content, settings.soldOut).values()];
  const periods = await venuePeriods(sql, site.orgId, site.venueId);
  const now = new Date();
  const tz = site.timezone;
  const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: tz });
  const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  const opts = (kind: "pickup" | "catering"): ReadyOption[] =>
    readyTimes(periods, tz, now, settings, kind).map((t) => ({ value: `${t.date}T${t.time}`, day: dayFmt.format(t.at), label: timeFmt.format(t.at) }));
  const paused = settings.pausedUntil && settings.pausedUntil > now;

  return (
    <div className="site-wrap" style={{ paddingTop: 48, paddingBottom: 88 }}>
      <div className="head" style={{ marginBottom: 32 }}>
        <p className="site-eyebrow">Order online</p>
        <h1 style={{ fontSize: "clamp(34px, 5vw, 50px)", lineHeight: 1.06, marginTop: 12 }}>
          {kinds.includes("catering") && !kinds.includes("pickup") ? `Catering from ${site.content.brand.name}.` : `Pickup from ${site.content.brand.name}.`}
        </h1>
        {paused && <p className="site-note" style={{ marginTop: 14 }}>The kitchen is catching up — the earliest pickup times are a little later than usual.</p>}
        {cancelled && <p className="site-note" style={{ marginTop: 14 }}>Payment was cancelled, so the order wasn&rsquo;t placed. Your choices are below.</p>}
      </div>
      {kinds.length === 0 || items.length === 0 ? (
        <div className="site-panel"><p style={{ margin: 0 }}>Online ordering isn&rsquo;t open right now.{site.content.contact.phone ? ` Call us at ${site.content.contact.phone} to order.` : ""}</p></div>
      ) : (
        <OrderBuilder
          slug={site.slug} items={items} kinds={kinds}
          times={{ pickup: settings.pickupEnabled ? opts("pickup") : [], catering: settings.cateringEnabled ? opts("catering") : [] }}
          taxBps={settings.taxBps} cateringMinCents={settings.cateringMinCents}
          payOnline={Boolean(process.env.STRIPE_SECRET_KEY?.trim())}
          hasAutoPromos={await hasAutomaticPromotions(sql, site.orgId, now)}
        />
      )}
    </div>
  );
}
