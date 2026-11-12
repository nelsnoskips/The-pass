import Link from "next/link";
import { PassMark } from "@/components/marketing/PassMark";
import { CommandBar } from "@/components/platform/CommandBar";
import { OfflineBar } from "@/components/platform/OfflineBar";
import { Sidebar } from "@/components/platform/Sidebar";
import { includes, planFor, type Feature } from "@/lib/billing/entitlements";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";

export const dynamic = "force-dynamic";

/** Sidebar pages that belong to a part of the business a plan can leave out. */
const PAGE_FEATURE: Record<string, Feature> = {
  app: "app", orders: "ordering", "gift-cards": "gift_cards", financials: "financials", reviews: "reviews",
  campaigns: "campaigns", segments: "segments", promotions: "promotions",
};

/**
 * The restaurant's frame: a top bar across the whole width (the
 * restaurant, search, the approvals inbox, the account), navigation
 * down the left, the page beside it.
 */
export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const { org, email, staff, tenant } = await requireTenant(slug);
  const [[{ n: waiting }], plan] = await Promise.all([
    db()!<{ n: number }[]>`select count(*)::int as n from agent_proposals where org_id = ${tenant.orgId} and status = 'pending'`,
    planFor(db()!, tenant.orgId),
  ]);
  const outOfPlan = Object.entries(PAGE_FEATURE).filter(([, f]) => !includes(plan, f)).map(([seg]) => seg);
  return (
    <div className="pf-app">
      <a href="#pf-main" className="pf-skip">Skip to content</a>
      <header className="pf-top">
        <div className="pf-top-inner">
          <a href={`/r/${org.slug}`} className="pf-org" title={org.name}><PassMark size={20} /><span>{org.name}</span></a>
          <CommandBar org={org.slug} />
          <div className="pf-top-actions">
            <Link href={`/r/${org.slug}/agents#queue`} className="pf-bell" aria-label={waiting ? `${waiting} waiting for your approval` : "Nothing waiting for approval"}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 19a2 2 0 0 0 4 0" /></svg>
              {waiting > 0 && <b>{waiting > 99 ? "99+" : waiting}</b>}
            </Link>
            <details className="pf-account">
              <summary aria-label="Account">{(email[0] ?? "?").toUpperCase()}</summary>
              <div className="pf-account-menu">
                <span className="email">{email}</span>
                <span className="role">{staff ? "studio" : tenant.role}</span>
                <Link href={`/r/${org.slug}/settings/team`}>Team</Link>
                {!staff && <form method="post" action="/api/platform/logout"><button type="submit">Sign out</button></form>}
              </div>
            </details>
          </div>
        </div>
      </header>
      <aside className="pf-app-side"><Sidebar org={org.slug} outOfPlan={outOfPlan} /></aside>
      <main className="pf-main" id="pf-main" tabIndex={-1}><OfflineBar />{children}</main>
    </div>
  );
}
