import { actorLabel } from "@/lib/agent-runtime/catalog";
import { PillarLevers } from "@/components/platform/PillarLevers";
import { SiteEditor } from "@/components/platform/SiteEditor";
import { PublishVersionButton } from "@/components/platform/VersionActions";
import { WebsiteAgentBox } from "@/components/platform/WebsiteAgentBox";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { getVersion, listVersions, siteForOrg } from "@/lib/sites/repo";
import { formatIn, venueTz } from "@/lib/platform/when";
import { hoursFromPeriods } from "@/lib/platform/hours";
import { listPeriods } from "@/lib/platform/settings";

export const dynamic = "force-dynamic";

export default async function Website({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const { tenant, venues } = await requireTenant(slug);
  const tz = venueTz(venues);
  const sql = db()!;
  const site = await siteForOrg(sql, tenant);
  if (!site) return <><div className="pf-head"><div><h1>Website</h1></div></div><p className="pf-empty pf-panel">Your website isn&rsquo;t on The Pass yet. The Pass team sets it up with you; ask them, or start in <a href={`/r/${slug}/settings`}>Settings</a>.</p></>;
  const versions = await listVersions(sql, tenant, site.id);
  // Edit from the newest version, so an unpublished draft isn't lost.
  const latest = versions[0] ? await getVersion(sql, tenant, versions[0].id) : null;
  const editable = can(tenant, "manage_venue");
  const when = (d: Date) => formatIn(d, tz, "datetime");
  const periods = venues[0] ? await listPeriods(sql, tenant, venues[0].id) : [];
  const serviceHours = hoursFromPeriods(periods);

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Website</h1>
          <p className="pf-sub">
            Live at <a href={`/s/${site.slug}`} target="_blank" rel="noreferrer" className="mono">/s/{site.slug}</a>
            {versions[0] && !versions[0].live && " · You have an unpublished draft"}
          </p>
        </div>
      </div>
      <PillarLevers pillar="website" org={slug} tenant={tenant} />
      <div className="pf-layout">
        <div>
          {editable && latest ? (
            <>
              <WebsiteAgentBox org={slug} />
              {/* Keyed on the newest version so an agent's draft reloads the form. */}
              <SiteEditor key={versions[0]?.id} org={slug} initial={latest} liveUrl={`/s/${site.slug}`} versionId={versions[0]?.id ?? ""} serviceHours={serviceHours} tz={tz} />
            </>
          ) : (
            <p className="pf-empty pf-panel">Only owners and managers can edit the website.</p>
          )}
        </div>
        <aside className="pf-sticky">
          <section className="pf-panel">
            <h2>History</h2>
            <div className="pf-body">
              {versions.map((v) => (
                <div key={v.id} style={{ display: "grid", gap: 6, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13.5 }}>{v.note || "Untitled change"}</span>
                    {v.live && <span className="pf-pill dot go">Live</span>}
                  </div>
                  <span className="pf-res-meta" style={{ marginTop: 0 }}>
                    <span className="mono">{when(v.created_at)}</span><span>{actorLabel(v.created_by)}</span>
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a className="pf-btn small" href={`/r/${slug}/website/preview/${v.id}`} target="_blank" rel="noreferrer">Preview</a>
                    {editable && !v.live && <PublishVersionButton org={slug} versionId={v.id} label={v === versions[0] ? "Publish" : "Restore this"} />}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
