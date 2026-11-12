import { ConfirmButton } from "@/components/platform/ConfirmButton";
import { SettingsNav } from "@/components/platform/SettingsNav";
import { db } from "@/lib/db";
import { googleConfigured } from "@/lib/integrations/google";
import { squareConfigured } from "@/lib/integrations/square";
import { toastConfigured, toastStatus } from "@/lib/integrations/toast";
import { ToastConnection } from "@/components/platform/ToastConnection";
import { orgTimezone } from "@/lib/levers";
import { formatIn } from "@/lib/platform/when";
import { googleAdsConfigured } from "@/lib/ads/google-ads";
import { metaConfigured } from "@/lib/ads/meta";
import { platformConfigured, PROVIDERS, type Category } from "@/lib/integrations/registry";
import { integrationsKeyConfigured } from "@/lib/integrations/secrets";
import { requireTenant } from "@/lib/platform/context";
import { listOrgIntegrations } from "@/lib/platform/settings";
import { integrationAction } from "@/lib/platform/settings-actions";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const ORDER: Category[] = ["AI", "Messaging", "Payments", "Discovery", "Marketing", "Point of sale"];
/** Each connection by the job it does for the restaurant, the vendor in brackets. */
const JOB: Record<string, string> = {
  anthropic: "The assistant and agents (Claude, by Anthropic)",
  twilio: "Text messages to guests (Twilio)",
  resend: "Emails to guests and sign-in links (Resend)",
  stripe: "Deposits and card payments (Stripe)",
  google_business: "Your Google listing and reviews (Google Business Profile)",
  reserve_with_google: "Booking from Google Search and Maps (Reserve with Google)",
  google_ads: "Google ads (Google Ads)",
  meta_ads: "Instagram and Facebook ads (Meta Ads)",
  square: "Checks and spend from your till (Square)",
  toast: "Checks and spend from your till (Toast)",
};
const CATEGORY: Record<string, string> = {
  AI: "The assistant", Messaging: "Texts and email", Payments: "Payments", Discovery: "Google", Marketing: "Ads", "Point of sale": "Point of sale",
};

/** What stops when a connection is cut, said before it's cut. */
const DISCONNECT: Record<string, string> = {
  google_business: "Hours stop syncing to Google and new reviews stop arriving here. You'll have to sign in with Google again to reconnect.",
  google_ads: "Ad reporting stops and approved budget changes can't be applied. You'll have to sign in with Google again to reconnect.",
  meta_ads: "Instagram and Facebook ad reporting stops. You'll have to sign in with Facebook again to reconnect.",
  square: "Checks stop matching to guests, so visits and spend stop filling in. You'll have to sign in with Square again to reconnect.",
};

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
  const squareReady = squareConfigured() && integrationsKeyConfigured();
  const adsReady = { google: googleAdsConfigured() && integrationsKeyConfigured(), meta: metaConfigured() && integrationsKeyConfigured() };
  const toast = await toastStatus(db()!, tenant);
  const tz = await orgTimezone(db()!, tenant);
  const toastLast = toast.lastSync
    ? `${formatIn(toast.lastSync.at, tz)} · ${toast.lastSync.ok ? `${toast.lastSync.rows} new check${toast.lastSync.rows === 1 ? "" : "s"}, ${toast.lastSync.matched} matched to guests` : "didn't finish"}`
    : null;

  return (
    <>
      <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">Everything The Pass connects to, and what each one does for you.</p></div></div>
      <SettingsNav org={org} ok={q.ok} err={q.err} />
      {ORDER.map((cat) => {
        const list = PROVIDERS.filter((p) => p.category === cat);
        return (
          <section key={cat} className="pf-panel" style={{ marginBottom: 14 }}>
            <h2>{CATEGORY[cat] ?? cat}</h2>
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
                        <span style={{ fontWeight: 600 }}>{JOB[p.id] ?? p.name}</span>
                        {p.build === "shell" ? <span className="pf-pill">Coming soon</span> : <span className={`pf-pill dot ${status.tone}`}>{status.text}</span>}
                        {p.scope === "platform" && <span className="pf-pill">Run by The Pass</span>}
                      </div>
                      <p className="pf-sub" style={{ margin: "4px 0 0" }}>{p.does}</p>
                      {own?.accountLabel && <p className="pf-sub mono" style={{ margin: "4px 0 0" }}>{own.accountLabel}</p>}
                    </div>
                    {p.id === "toast" && manage && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <ToastConnection org={org} connected={toast.connected} restaurantName={toast.restaurantName} lastSync={toastLast}
                          problem={toast.error} available={toastConfigured()} />
                      </div>
                    )}
                    {p.scope === "restaurant" && p.id !== "toast" && manage && (p.build !== "shell" || staff) && (
                      <form action={integrationAction} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="org" value={org} />
                        <input type="hidden" name="provider" value={p.id} />
                        {own?.status === "connected" ? (
                          <><input type="hidden" name="status" value="disconnected" /><ConfirmButton className="pf-btn small quiet" message={`Disconnect ${p.name}? ${DISCONNECT[p.id] ?? "The Pass stops using it until you connect it again."}`}>Disconnect</ConfirmButton></>
                        ) : staff && own?.status === "requested" ? (
                          <>
                            <input className="pf-input" name="label" placeholder="Account name" style={{ minHeight: 34, width: 160 }} />
                            <input type="hidden" name="status" value="connected" />
                            <button className="pf-btn small primary">Mark connected</button>
                          </>
                        ) : p.id === "google_business" && googleReady ? (
                          <a className="pf-btn small primary" href={`/api/integrations/google/start?org=${org}`}>Sign in with Google</a>
                        ) : p.id === "google_ads" && adsReady.google ? (
                          <a className="pf-btn small primary" href={`/api/integrations/google-ads/start?org=${org}`}>Sign in with Google</a>
                        ) : p.id === "meta_ads" && adsReady.meta ? (
                          <a className="pf-btn small primary" href={`/api/integrations/meta/start?org=${org}`}>Sign in with Facebook</a>
                        ) : p.id === "square" && squareReady ? (
                          <a className="pf-btn small primary" href={`/api/integrations/square/start?org=${org}`}>Sign in with Square</a>
                        ) : own?.status === "requested" ? null : (
                          <><input type="hidden" name="status" value="requested" /><button className="pf-btn small">Connect</button></>
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
