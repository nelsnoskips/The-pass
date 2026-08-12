import { Badge, statusTone } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/Card";
import { SyncNowButton } from "@/components/integrations/SyncNowButton";
import { canManageIntegrations, getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getCampaignRows,
  getIntegrationConnections,
  getSyncRuns,
} from "@/lib/data/demo";
import { DEFAULT_FILTERS } from "@/lib/filters";
import { resolvePreset } from "@/lib/dates";
import { formatDate, formatDateTime, formatCount } from "@/lib/format";
import { TYPE_LABELS, platformLabel } from "@/lib/viewModels";

export const metadata = { title: "Integrations — The Pass" };

const FUTURE_CARDS = [
  {
    name: "Google Analytics 4",
    note: "Website behavior and cross-channel context.",
  },
  { name: "Reservation platforms", note: "OpenTable / Resy tracked reservations." },
  { name: "POS / online ordering", note: "Toast tracked transaction revenue." },
];

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  const anchor = demoAnchor();
  const connections = getIntegrationConnections(anchor);
  const syncRuns = getSyncRuns(anchor).slice(0, 8);
  const isAdmin = canManageIntegrations(user);
  const range = resolvePreset("last_30", anchor);
  const rows = getCampaignRows(user, DEFAULT_FILTERS, range, anchor);
  const unmapped = rows.filter((r) => r.locationName === null);

  return (
    <div className="space-y-5">
      <div>
        <p className="micro-label text-champagne">Integrations</p>
        <h1 className="mt-1 font-display text-[26px] text-ink">
          Connected platforms
        </h1>
        <p className="mt-1 text-[13px] text-slate">
          Ad platforms are connected with least-privilege, read-only OAuth.
          Tokens stay encrypted server-side and are never shown in the
          browser — no integration ever asks you to paste an access token.
        </p>
        {!isAdmin && (
          <p className="mt-2 inline-block rounded-lg bg-canvas px-3 py-1.5 text-[12.5px] text-slate">
            You have read-only access here — only admins can change
            integrations.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {connections.map((conn) => (
          <section
            key={conn.id}
            className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[16px] font-semibold text-ink">
                  {conn.platform === "google" ? "Google Ads" : "Meta Ads"}
                </h2>
                <p className="text-[12.5px] text-slate">
                  {conn.accountName} ·{" "}
                  <span className="tnum">{conn.accountExternalId}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone={statusTone(conn.status)}>
                  {conn.status.replace("_", " ")}
                </Badge>
                <Badge tone="champagne">Demo mode</Badge>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <dt className="font-medium text-slate">Last successful sync</dt>
                <dd className="tnum mt-0.5 text-ink">
                  {conn.lastSyncAt ? formatDateTime(conn.lastSyncAt) : "Never"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate">Data through</dt>
                <dd className="tnum mt-0.5 text-ink">
                  {conn.dataThrough ? formatDate(conn.dataThrough) : "—"}
                </dd>
              </div>
            </dl>
            {isAdmin && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
                <SyncNowButton />
                <span className="text-[12px] text-slate">
                  Automated sync runs several times daily with an attribution
                  lookback window; upserts are idempotent.
                </span>
              </div>
            )}
          </section>
        ))}

        {FUTURE_CARDS.map((card) => (
          <section
            key={card.name}
            className="rounded-2xl border border-dashed border-line bg-canvas/50 p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[16px] font-semibold text-slate">{card.name}</h2>
                <p className="text-[12.5px] text-slate">{card.note}</p>
              </div>
              <Badge tone="slate">Not connected</Badge>
            </div>
            <p className="mt-3 text-[12px] text-slate">
              Planned for phase two — enables tracked revenue and stronger
              attribution.
            </p>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="Campaign → location mappings" className="mb-1" />
        <p className="mb-4 max-w-2xl text-[12.5px] text-slate">
          Campaigns are imported from each ad account and mapped to restaurant
          locations by picking from a list — never by typing IDs. Removing a
          mapping or disconnecting an integration preserves all historical
          reporting.
        </p>
        {unmapped.length > 0 && (
          <p className="mb-3 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] font-medium text-warning">
            {formatCount(unmapped.length)} campaign(s) are unassigned and
            excluded from location reporting.
          </p>
        )}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="ledger w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                <th className="px-3 py-2.5 text-left">Campaign ID</th>
                <th className="px-3 py-2.5 text-left">Campaign name</th>
                <th className="px-3 py-2.5 text-left">Type</th>
                <th className="px-3 py-2.5 text-left">Platform</th>
                <th className="px-3 py-2.5 text-left">Mapped location</th>
                <th className="px-3 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.campaign.id} className="border-b border-line/70 last:border-0">
                  <td className="tnum px-3 py-2.5 text-slate">{r.campaign.externalId}</td>
                  <td className="max-w-72 truncate px-3 py-2.5 font-medium text-ink" title={r.campaign.name}>
                    {r.campaign.name}
                  </td>
                  <td className="px-3 py-2.5">{TYPE_LABELS[r.campaign.type]}</td>
                  <td className="px-3 py-2.5">{platformLabel(r.campaign.platform)}</td>
                  <td className="px-3 py-2.5">
                    {r.locationName ?? <Badge tone="warning">Unassigned</Badge>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone="emerald">Mapped</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="Sync history" className="mb-4" />
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="ledger w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                <th className="px-3 py-2.5 text-left">Started</th>
                <th className="px-3 py-2.5 text-left">Connection</th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-right">Records upserted</th>
                <th className="px-3 py-2.5 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {syncRuns.map((run) => (
                <tr key={run.id} className="border-b border-line/70 last:border-0">
                  <td className="tnum px-3 py-2.5">{formatDateTime(run.startedAt)}</td>
                  <td className="px-3 py-2.5">
                    {run.connectionId === "conn_google" ? "Google Ads" : "Meta Ads"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                  </td>
                  <td className="tnum px-3 py-2.5 text-right">{formatCount(run.recordsUpserted)}</td>
                  <td className="max-w-80 px-3 py-2.5 text-slate">{run.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-slate">
          Permission, quota, mapping, and token-expiration errors surface as
          separate categories; transient API failures retry with backoff. Live
          connectors require the environment variables documented in{" "}
          <code className="rounded bg-canvas px-1">lib/connectors/index.ts</code>{" "}
          and <code className="rounded bg-canvas px-1">.env.example</code>.
        </p>
      </section>
    </div>
  );
}
