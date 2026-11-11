import { PassMark } from "@/components/marketing/PassMark";
import { PlatformNav } from "@/components/platform/PlatformNav";
import { requireTenant } from "@/lib/platform/context";

export const dynamic = "force-dynamic";

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const { org, email, staff, tenant } = await requireTenant(slug);
  return (
    <>
      <header className="pf-top">
        <div className="pf-top-inner">
          <a href={`/r/${org.slug}`} className="pf-org"><PassMark size={20} />{org.name}</a>
          <PlatformNav org={org.slug} />
          <div className="pf-who">
            <span className="email">{email}</span>
            <span className="role">{staff ? "studio" : tenant.role}</span>
            {!staff && (
              <form method="post" action="/api/platform/logout"><button type="submit">Sign out</button></form>
            )}
          </div>
        </div>
      </header>
      <main className="pf-main">{children}</main>
    </>
  );
}
