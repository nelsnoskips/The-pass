import Link from "next/link";
import { PassMark } from "@/components/marketing/PassMark";
import { CommandBar } from "@/components/platform/CommandBar";
import { Sidebar } from "@/components/platform/Sidebar";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";

export const dynamic = "force-dynamic";

/**
 * The restaurant's frame: a top bar across the whole width (the
 * restaurant, search, the approvals inbox, the account), navigation
 * down the left, the page beside it.
 */
export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const { org, email, staff, tenant } = await requireTenant(slug);
  const [{ n: waiting }] = await db()!<{ n: number }[]>`
    select count(*)::int as n from agent_proposals where org_id = ${tenant.orgId} and status = 'pending'`;
  return (
    <div className="pf-app">
      <header className="pf-top">
        <div className="pf-top-inner">
          <a href={`/r/${org.slug}`} className="pf-org"><PassMark size={20} /><span>{org.name}</span></a>
          <CommandBar org={org.slug} />
          <div className="pf-top-actions">
            <Link href={`/r/${org.slug}/agents`} className="pf-bell" aria-label={waiting ? `${waiting} waiting for your approval` : "Nothing waiting for approval"}>
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
      <aside className="pf-app-side"><Sidebar org={org.slug} /></aside>
      <main className="pf-main">{children}</main>
    </div>
  );
}
