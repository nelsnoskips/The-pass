import { notFound } from "next/navigation";
import { SiteHome } from "@/components/sites/SiteHome";
import { SiteShell } from "@/components/sites/SiteShell";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { getVersion, siteForOrg } from "@/lib/sites/repo";
import "@/app/(sites)/sites.css";

export const dynamic = "force-dynamic";

/** A version exactly as guests would see it, behind the restaurant's sign-in. */
export default async function Preview({ params }: { params: Promise<{ org: string; version: string }> }) {
  const { org, version } = await params;
  const { tenant } = await requireTenant(org);
  const sql = db()!;
  const [site, content] = await Promise.all([siteForOrg(sql, tenant), getVersion(sql, tenant, version)]);
  if (!site || !content) notFound();
  const banner = (
    <p style={{ background: "#111", color: "#fff", textAlign: "center", font: "500 12px/1.4 ui-monospace, monospace", padding: "8px 12px", letterSpacing: ".06em", margin: 0 }}>
      PREVIEW · {site.publishedVersionId === version ? "this is what's live" : "not live yet"}
    </p>
  );
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "auto", zIndex: 50 }}>
      <SiteShell content={content} base={`/s/${site.slug}`} banner={banner}>
        <SiteHome content={content} base={`/s/${site.slug}`} preview />
      </SiteShell>
    </div>
  );
}
