import Link from "next/link";
import { planLock } from "@/components/platform/NotInPlan";
import { PeriodNav, TabNav, hrefWith } from "@/components/platform/ReportBits";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { dayLabel } from "@/lib/reports/format";
import { parseDays, periodsForOrg } from "@/lib/reports/period";
import { AdsTab, adsRangeText } from "./AdsTab";
import { BookingsTab, GuestsTab, OrdersTab, OverviewTab } from "./Tabs";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "bookings", label: "Bookings" },
  { key: "orders", label: "Online orders" },
  { key: "guests", label: "Guests" },
  { key: "ads", label: "Ads" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/**
 * The reporting hub: how the restaurant is doing across bookings, online
 * orders, guests and ads, for the last 7, 30 or 90 days against the same
 * stretch before. The page only picks the tab; lib/reports does the sums.
 */
export default async function Reporting({ params, searchParams }: {
  params: Promise<{ org: string }>; searchParams: Promise<{ days?: string; tab?: string; compare?: string }>;
}) {
  const { org } = await params;
  const q = await searchParams;
  const tab: TabKey = TABS.find((t) => t.key === q.tab)?.key ?? "overview";
  const days = parseDays(q.days);
  const compare = q.compare !== "off";
  const { tenant } = await requireTenant(org);
  // Online orders and ads reporting are full reporting: The Pass plan.
  const locked = tab === "orders" || tab === "ads"
    ? await planLock(org, tenant, "reporting_full", { back: `/r/${org}/reporting`, inline: true }) : null;
  const p = await periodsForOrg(db()!, tenant.orgId, days);
  const base = `/r/${org}/reporting`;
  const keep = { tab, compare: compare ? null : "off" };
  const sub = tab === "ads"
    ? adsRangeText(days)
    : `${dayLabel(p.cur.since)} – ${dayLabel(p.cur.until)}${compare ? ` · compared with ${dayLabel(p.prev.since)} – ${dayLabel(p.prev.until)}` : ""}`;

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Reporting</h1>
          <p className="pf-sub">{sub}</p>
        </div>
        <div className="pf-daynav" style={{ flexWrap: "wrap" }}>
          {tab !== "ads" && (
            <Link href={hrefWith(base, { tab, days, compare: compare ? "off" : null })} className="pf-btn small quiet" aria-pressed={compare}>
              {compare ? "Hide comparison" : "Compare with previous period"}
            </Link>
          )}
          <PeriodNav base={base} days={days} params={keep} />
        </div>
      </div>

      <TabNav label="Reports" active={tab}
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: hrefWith(base, { tab: t.key === "overview" ? null : t.key, days, compare: compare ? null : "off" }) }))} />

      {tab === "overview" && <OverviewTab org={org} tenant={tenant} p={p} compare={compare} />}
      {tab === "bookings" && <BookingsTab org={org} tenant={tenant} p={p} compare={compare} />}
      {tab === "orders" && (locked ?? <OrdersTab org={org} tenant={tenant} p={p} compare={compare} />)}
      {tab === "guests" && <GuestsTab org={org} tenant={tenant} p={p} compare={compare} />}
      {tab === "ads" && (locked ?? <AdsTab org={org} tenant={tenant} days={days} />)}
    </>
  );
}
