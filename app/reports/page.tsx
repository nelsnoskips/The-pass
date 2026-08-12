import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, FileText, Newspaper } from "lucide-react";
import { SavedReports } from "@/components/reports/SavedReports";
import { getCurrentUser } from "@/lib/auth";
import { serializeFilters, parseFilters, type SearchParams } from "@/lib/filters";

export const metadata = { title: "Reports — The Pass" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const qs = serializeFilters(filters);

  return (
    <div className="space-y-5">
      <div>
        <p className="micro-label text-champagne">Reports</p>
        <h1 className="mt-1 font-display text-[26px] text-ink">
          Executive reporting
        </h1>
        <p className="mt-1 text-[13px] text-slate">
          Polished views for owners and partners. Every report honors the
          active brand, location, platform, and date filters.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Link
          href={qs ? `/reports/executive?${qs}` : "/reports/executive"}
          className="lift group rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]"
        >
          <span className="inline-flex rounded-xl bg-cobalt-soft p-2.5 text-cobalt">
            <FileText size={20} strokeWidth={1.8} aria-hidden />
          </span>
          <h2 className="mt-3 flex items-center gap-1 text-[17px] font-semibold text-ink group-hover:text-cobalt">
            Executive Report
            <ArrowUpRight size={15} aria-hidden />
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate">
            Total performance, location and platform comparison, top campaigns,
            conversions, and plain-language insights for the selected period.
            Print or save as PDF.
          </p>
        </Link>

        <Link
          href={qs ? `/reports/month-in-review?${qs}` : "/reports/month-in-review"}
          className="lift group rounded-2xl border border-champagne/50 bg-gradient-to-b from-champagne-soft to-surface p-6 shadow-[var(--shadow-card)]"
        >
          <span className="inline-flex rounded-xl bg-ink p-2.5 text-champagne">
            <Newspaper size={20} strokeWidth={1.8} aria-hidden />
          </span>
          <h2 className="mt-3 flex items-center gap-1 font-display text-[19px] text-ink group-hover:text-cobalt">
            The Month in Review
            <ArrowUpRight size={15} aria-hidden />
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate">
            A concise executive publication: results, the work behind them,
            what we learned, and what&apos;s next — with a personal note from your
            strategist.
          </p>
        </Link>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-[15px] font-semibold text-ink">Saved reports</h2>
        <p className="mb-3 mt-0.5 text-[12.5px] text-slate">
          Capture the current combination of locations, platforms, date range,
          and comparison to return to it in one click.
        </p>
        <Suspense fallback={null}>
          <SavedReports userId={user.id} />
        </Suspense>
      </section>

      <p className="text-[12px] text-slate">
        Scheduled email delivery (weekly/monthly) arrives in a later phase,
        after email infrastructure is in place.
      </p>
    </div>
  );
}
