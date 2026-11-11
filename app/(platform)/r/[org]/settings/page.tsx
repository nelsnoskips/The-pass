import { SettingsNav } from "@/components/platform/SettingsNav";
import { db } from "@/lib/db";
import { googleConfigured } from "@/lib/integrations/google";
import { platformConfigured, PROVIDERS, type Category } from "@/lib/integrations/registry";
import { integrationsKeyConfigured } from "@/lib/integrations/secrets";
import { requireTenant } from "@/lib/platform/context";
import { listOrgIntegrations } from "@/lib/platform/settings";
import { integrationAction } from "@/lib/platform/settings-actions";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const ORDER: Category[] = ["AI", "Messaging", "Payments", "Discovery", "Marketing", "Point of sale"];
const LABEL: Record<string, { text: string; tone: string }> = {
  requested: { text: "Requested", tone: "warn" },
  connected: { text: "Connected", tone: "go" },
  error: { text: "Needs attention", tone: "stop" },
  disconnected: { text: "Not connected", tone: "" },
};

export default async function Connections({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, staff } = await requireTenant(org);
  const mine = new Map((await listOrgIntegrations(db()!, tenant)).map((i) => [i.provider, i]));
  const manage = can(tenant, "manage_venue");
  const googleReady = googleConfigured() && integrationsKeyConfigured();

  return (
    <>
      <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">Everything The Pass connects to, and what each one does for you.</p></div></div>
      <SettingsNav org={org} ok={q.ok} err={q.err} />
      {ORDER.map((cat) => {
        const list = PROVIDERS.filter((p) => p.category === cat);
        return (
          <section key={cat} className="pf-panel" style={{ marginBottom: 14 }}>
            <h2>{cat}</h2>
            <div className="pf-body">
              {list.map((p) => {
                const own = mine.get(p.id);
                const status = p.scope === "platform"
                  ? (platformConfigured(p) ? { text: "Active", tone: "go" } : { text: "Not set up", tone: "" })
                  : LABEL[own?.status ?? "disconnected"];
                return (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--rule)" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <span className={`pf-pill dot ${status.tone}`}>{status.text}</span>
                        {p.build === "shell" && <span className="pf-pill">Coming</span>}
                        {p.scope === "platform" && <span className="pf-pill">Run by The Pass</span>}
                      </div>
                      <p className="pf-sub" style={{ margin: "4px 0 0" }}>{p.does}</p>
                      {own?.accountLabel && <p className="pf-sub mono" style={{ margin: "4px 0 0" }}>{own.accountLabel}</p>}
                    </div>
                    {p.scope === "restaurant" && manage && (
                      <form action={integrationAction} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="org" value={org} />
                        <input type="hidden" name="provider" value={p.id} />
                        {own?.status === "connected" ? (
                          <button className="pf-btn small quiet" name="status" value="disconnected">Disconnect</button>
                        ) : staff && own?.status === "requested" ? (
                          <>
                            <input className="pf-input" name="label" placeholder="Account name" style={{ minHeight: 34, width: 160 }} />
                            <button className="pf-btn small primary" name="status" value="connected">Mark connected</button>
                          </>
                        ) : p.id === "google_business" && googleReady ? (
                          <a className="pf-btn small primary" href={`/api/integrations/google/start?org=${org}`}>Sign in with Google</a>
                        ) : own?.status === "requested" ? null : (
                          <button className="pf-btn small" name="status" value="requested">Connect</button>
                        )}
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
