import Link from "next/link";
import { adReport } from "@/lib/ads/report";
import { windowDates } from "@/lib/ads/store";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { listOrgIntegrations } from "@/lib/platform/settings";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;
const money = (c: number | null) => (c === null ? "—" : `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 && c < 100000 ? 2 : 0, maximumFractionDigits: 2 })}`);
const count = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(2)}%`);
const PLATFORM = { google: "Google Ads", meta: "Meta" } as const;
const SOURCE: Record<string, string> = { website: "Your website", phone: "Phone", walk_in: "Walk-in", google: "Google", instagram: "Instagram", import: "Imported", agent: "Agent" };

/**
 * What the ads cost and what they brought in, beside what actually
 * happened in the room. Numbers are as Google and Meta report them; The
 * Pass never claims a booking came from an ad unless the platform said so.
 */
export default async function Reporting({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ days?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const days = RANGES.find((d) => String(d) === q.days) ?? 30;
  const { tenant } = await requireTenant(org);
  const sql = db()!;
  const { since, until } = windowDates(days);
  const [r, ints] = await Promise.all([adReport(sql, tenant, since, until), listOrgIntegrations(sql, tenant)]);
  const connected = new Set(ints.filter((i) => i.status === "connected").map((i) => i.provider));
  const none = !connected.has("google_ads") && !connected.has("meta_ads");
  const maxSpend = Math.max(1, ...r.days.map((d) => d.spendCents));
  const maxResults = Math.max(1, ...r.days.map((d) => d.conversions));
  const label = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const when = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d) : "never");

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Reporting</h1>
          <p className="pf-sub">{label(since)} – {label(until)} · as Google and Meta report it, beside your bookings</p>
        </div>
        <nav className="pf-daynav" aria-label="Range">
          {RANGES.map((d) => <Link key={d} href={`/r/${org}/reporting?days=${d}`} className={`pf-btn small${d === days ? " primary" : ""}`}>{d} days</Link>)}
        </nav>
      </div>

      {none && (
        <section className="pf-panel" style={{ marginBottom: 18 }}>
          <div className="pf-body" style={{ paddingTop: 16 }}>
            <p style={{ margin: 0 }}>Connect Google Ads or Meta to see what your ads cost and what they bring in.</p>
            <Link className="pf-btn primary" href={`/r/${org}/settings`} style={{ justifySelf: "start" }}>Connect ad accounts</Link>
          </div>
        </section>
      )}

      <div className="pf-stats">
        <div className="pf-stat"><b>{money(r.total.spendCents)}</b><span>spent on ads</span></div>
        <div className="pf-stat"><b>{count(r.total.conversions)}</b><span>results the platforms reported</span></div>
        <div className="pf-stat"><b>{money(r.totalDerived.costPerResultCents)}</b><span>cost per result</span></div>
        <div className="pf-stat"><b>{count(r.bookingsTotal)}</b><span>bookings in The Pass · {count(r.coversTotal)} covers</span></div>
        <div className="pf-stat"><b>{pct(r.totalDerived.ctr)}</b><span>click-through rate</span></div>
      </div>

      <div className="pf-layout">
        <div style={{ display: "grid", gap: 18 }}>
          <section className="pf-panel">
            <h2>Spend and results by day</h2>
            <div className="pf-body">
              {r.days.length === 0 ? <p className="pf-empty" style={{ padding: 24 }}>No ad spend in this range.</p> : (
                <>
                  <div role="img" aria-label={`Daily ad spend from ${label(since)} to ${label(until)}`}
                    style={{ display: "flex", alignItems: "flex-end", gap: days > 30 ? 1 : 3, height: 170, paddingTop: 14 }}>
                    {r.days.map((d) => (
                      <div key={d.day} title={`${label(d.day)}: ${money(d.spendCents)} spent · ${count(d.conversions)} results · ${d.bookings} bookings`}
                        style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", position: "relative" }}>
                        {d.conversions > 0 && (
                          <span aria-hidden style={{ position: "absolute", bottom: `calc(${(d.spendCents / maxSpend) * 100}% + 6px)`, width: 6, height: 6, borderRadius: 999,
                            background: "var(--brand)", boxShadow: "0 0 8px var(--brand)", opacity: Math.min(1, 0.35 + d.conversions / maxResults) }} />
                        )}
                        <span style={{ width: "100%", height: `${Math.max(2, (d.spendCents / maxSpend) * 100)}%`, borderRadius: "4px 4px 1px 1px",
                          background: "linear-gradient(180deg, var(--brand), var(--brand-2))", opacity: 0.85 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }} className="mono">
                    <span style={{ color: "var(--faint)" }}>{label(r.days[0].day)}</span>
                    <span style={{ color: "var(--muted)" }}>bars: spend · dots: results (brighter = more)</span>
                    <span style={{ color: "var(--faint)" }}>{label(r.days[r.days.length - 1].day)}</span>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="pf-panel pf-scroll">
            <h2>Campaigns</h2>
            {r.campaigns.length === 0 ? <p className="pf-empty">No campaigns yet.</p> : (
              <table className="pf-table">
                <thead><tr><th>Campaign</th><th>Spend</th><th>Clicks</th><th>CTR</th><th>Results</th><th>Cost / result</th><th>Value / spend</th></tr></thead>
                <tbody>
                  {r.campaigns.map((c) => (
                    <tr key={`${c.platform}:${c.campaignId}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div className="pf-res-meta" style={{ marginTop: 2 }}>
                          <span className="pf-pill">{PLATFORM[c.platform]}</span>
                          {c.channel && c.channel !== "meta" && <span>{c.channel.replace(/_/g, " ")}</span>}
                          {c.status && c.status !== "enabled" && <span>{c.status}</span>}
                        </div>
                      </td>
                      <td className="num">{money(c.spendCents)}</td>
                      <td className="num">{count(c.clicks)}</td>
                      <td className="num">{pct(c.derived.ctr)}</td>
                      <td className="num">{count(c.conversions)}</td>
                      <td className="num">{money(c.derived.costPerResultCents)}</td>
                      <td className="num">{c.derived.roas === null || c.conversionValueCents === 0 ? "—" : `${c.derived.roas.toFixed(1)}×`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside className="pf-sticky">
          <section className="pf-panel">
            <h2>By platform</h2>
            <div className="pf-body">
              {(["google", "meta"] as const).map((p) => {
                const t = r.platforms[p];
                const key = p === "google" ? "google_ads" : "meta_ads";
                const s = r.sync[p];
                return (
                  <div key={p} style={{ display: "grid", gap: 4, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <b>{PLATFORM[p]}</b>
                      <span className={`pf-pill dot ${connected.has(key) ? (s?.lastStatus === "failed" ? "stop" : "go") : ""}`}>
                        {connected.has(key) ? (s?.lastStatus === "failed" ? "Sync failed" : "Connected") : "Not connected"}
                      </span>
                    </div>
                    {t ? (
                      <span className="pf-sub" style={{ margin: 0 }}>{money(t.spendCents)} · {count(t.conversions)} results · {money(t.conversions ? Math.round(t.spendCents / t.conversions) : null)} each</span>
                    ) : <span className="pf-sub" style={{ margin: 0 }}>No spend in this range.</span>}
                    {connected.has(key) && <span className="pf-sub mono" style={{ margin: 0, fontSize: 11.5 }}>Updated {when(s?.okAt ?? null)}</span>}
                    {s?.lastStatus === "failed" && s.lastError && <span className="pf-msg err" style={{ fontSize: 12 }}>{s.lastError}</span>}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="pf-panel">
            <h2>Where bookings came from</h2>
            <div className="pf-body">
              {Object.keys(r.bookingsBySource).length === 0 ? <p className="pf-sub" style={{ margin: 0 }}>No bookings in this range.</p> :
                Object.entries(r.bookingsBySource).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
                  <div key={s} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                    <span>{SOURCE[s] ?? s}</span><span className="mono">{n}</span>
                  </div>
                ))}
              <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Results above are what Google and Meta counted. Bookings are what happened in The Pass. The two are shown side by side, not merged.</p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
