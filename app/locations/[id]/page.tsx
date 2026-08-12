import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getCampaignRows,
  getConversionActions,
  getLocations,
} from "@/lib/data/demo";
import {
  parseFilters,
  resolveRanges,
  serializeFilters,
  type SearchParams,
} from "@/lib/filters";
import { formatCents, formatCount } from "@/lib/format";
import { STRATEGIST } from "@/lib/data/seed";
import { TYPE_LABELS, platformLabel } from "@/lib/viewModels";

export const metadata = { title: "Location profile — The Pass" };

export default async function LocationProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const anchor = demoAnchor();
  const { current } = resolveRanges(filters, anchor);

  const location = getLocations(user).find((l) => l.id === id);
  if (!location) notFound();

  const rows = getCampaignRows(
    user,
    { ...filters, locationIds: [id], platform: "all", googleRefine: "all" },
    current,
    anchor,
  );
  const actions = getConversionActions();
  const qs = serializeFilters(filters);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={qs ? `/locations?${qs}` : "/locations"}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-cobalt hover:underline"
        >
          <ArrowLeft size={14} aria-hidden />
          All locations
        </Link>
        <h1 className="mt-2 font-display text-[26px] text-ink">{location.name}</h1>
        <p className="mt-1 text-[13px] text-slate">
          Daily reporting and calendar items for this location use{" "}
          <strong className="font-medium text-ink">{location.timezone}</strong>.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <SectionHeading title="Profile" className="mb-3" />
          <dl className="space-y-2.5 text-[13px]">
            {[
              ["Address", `${location.address}, ${location.city}, ${location.state} ${location.zip}`],
              ["Timezone", location.timezone],
              ["Phone", location.phone],
              ["Website", location.website],
              ["Primary contact", `${STRATEGIST.name} (${STRATEGIST.role})`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11.5px] font-medium uppercase tracking-wide text-slate">
                  {label}
                </dt>
                <dd className="mt-0.5 break-words text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {location.notes && (
            <p className="mt-4 rounded-lg bg-canvas px-3 py-2.5 text-[12.5px] text-slate">
              {location.notes}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <SectionHeading title="Campaign mappings" className="mb-1" />
          <p className="mb-4 text-[12.5px] text-slate">
            Campaigns mapped to this location. Mappings are managed in
            Integrations; removing a mapping never deletes historical data.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="ledger w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b border-line bg-canvas/60">
                  <th className="px-3 py-2.5 text-left">Campaign</th>
                  <th className="px-3 py-2.5 text-left">Platform</th>
                  <th className="px-3 py-2.5 text-left">Type</th>
                  <th className="px-3 py-2.5 text-left">External ID</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-right">Spend (period)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.campaign.id} className="border-b border-line/70 last:border-0">
                    <td className="max-w-64 px-3 py-2.5">
                      <Link
                        href={`/campaigns/${r.campaign.id}${qs ? `?${qs}` : ""}`}
                        className="block truncate font-medium text-ink hover:text-cobalt"
                        title={r.campaign.name}
                      >
                        {r.campaign.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{platformLabel(r.campaign.platform)}</td>
                    <td className="px-3 py-2.5">{TYPE_LABELS[r.campaign.type]}</td>
                    <td className="tnum px-3 py-2.5 text-slate">{r.campaign.externalId}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={statusTone(r.campaign.status)}>{r.campaign.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right">{formatCents(r.totals.spendCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionHeading title="Conversion values" className="mb-1 mt-6" />
          <p className="mb-3 text-[12.5px] text-slate">
            Estimated value per conversion for this brand. Location-level
            overrides would apply here; none are configured.
          </p>
          <ul className="flex flex-wrap gap-2 text-[13px]">
            {actions
              .filter((a) => a.estimatedValueCents !== null)
              .map((a) => (
                <li key={a.id} className="rounded-lg border border-line px-3 py-1.5">
                  <span className="text-slate">{a.rawName}:</span>{" "}
                  <span className="tnum font-semibold text-ink">
                    {formatCents(a.estimatedValueCents)}
                  </span>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-[12px] text-slate">
            {formatCount(rows.length)} campaigns mapped · values labeled{" "}
            <em>Estimated Marketing Revenue</em> throughout reporting.
          </p>
        </section>
      </div>
    </div>
  );
}
