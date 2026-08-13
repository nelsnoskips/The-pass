import Link from "next/link";
import { PassMark } from "./PassMark";

/**
 * The Pass platform preview — an illustrative rendering of the campaign
 * intelligence interface. Figures shown are representative product UI, not
 * client results.
 */

const NAV_ITEMS = [
  "Overview", "Performance", "Reservations", "Revenue", "Traffic",
  "Search Visibility", "Paid Media", "Content", "Reports",
];

const KPIS = [
  { label: "Reservations", value: "1,246", delta: "+24%" },
  { label: "Revenue", value: "$487,650", delta: "+18%" },
  { label: "Cover Rate", value: "2.3×", delta: "+12%" },
  { label: "ROAS", value: "6.7×", delta: "+31%" },
];

const CHANNELS = [
  { label: "Organic Search", pct: 41 },
  { label: "Direct", pct: 24 },
  { label: "Paid Search", pct: 18 },
  { label: "Social", pct: 9 },
  { label: "Other", pct: 8 },
];

const SPARK = [42, 55, 48, 62, 58, 71, 66, 78, 74, 85, 80, 92];

export function PlatformPreview() {
  const W = 320;
  const H = 96;
  const max = Math.max(...SPARK);
  const path = SPARK.map(
    (v, i) =>
      `${i === 0 ? "M" : "L"}${((i / (SPARK.length - 1)) * W).toFixed(1)},${(H - (v / max) * (H - 10)).toFixed(1)}`,
  ).join(" ");

  return (
    <section
      id="the-pass"
      className="scroll-mt-24 bg-[#F1EDE5] px-5 pb-24 sm:px-8 sm:pb-32"
    >
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="mk-label flex items-center gap-2.5 text-[#4B1719]">
            <PassMark size={16} color="#4B1719" />
            The Pass Platform
          </p>
          <h2 className="mt-6 font-editorial text-[38px] leading-[1.06] text-[#0A0A09] sm:text-[48px]">
            Clarity across every location, campaign, and{" "}
            <em className="italic text-[#4B1719]">guest.</em>
          </h2>
          <p className="mt-6 max-w-[440px] text-[15px] leading-relaxed text-[#1A1310]/75">
            Every Madison Four engagement includes The Pass — our proprietary
            reporting and restaurant intelligence platform. Reservations,
            revenue, search visibility, and paid media in one live view, with
            every number traceable to its source. No mystery metrics. No
            monthly PDF graveyard.
          </p>
          <ul className="mt-8 space-y-3 text-[14px] text-[#1A1310]/80">
            {[
              "Live dashboards for every location",
              "Revenue tied to average ticket, not vanity clicks",
              "SEO, AEO, and paid media in one report",
              "Executive briefings written in plain language",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 bg-[#83A978]" />
                {line}
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard"
            className="mk-label group mt-10 inline-flex items-center gap-3 text-[#4B1719] transition-colors hover:text-[#0A0A09]"
          >
            View the full platform
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* Illustrative interface panel. */}
        <div
          aria-label="Preview of The Pass campaign intelligence interface (illustrative data)"
          className="overflow-hidden border border-[#B79A68]/30 bg-[#12100D] shadow-[0_32px_80px_-24px_rgba(10,10,9,0.55)]"
        >
          <div className="flex items-center justify-between border-b border-[#F1EDE5]/10 px-5 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#F1EDE5]/80">
              The Pass <span className="text-[#F1EDE5]/35">/ Campaign Intelligence</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#B79A68]">
              May 1 – May 31
            </p>
          </div>
          <div className="grid grid-cols-[124px_1fr] max-sm:grid-cols-1">
            <nav aria-hidden className="border-r border-[#F1EDE5]/10 py-3 max-sm:hidden">
              {NAV_ITEMS.map((item, i) => (
                <p
                  key={item}
                  className={`px-4 py-1.5 text-[10.5px] tracking-wide ${
                    i === 1
                      ? "border-l-2 border-[#83A978] bg-[#F1EDE5]/5 text-[#F1EDE5]"
                      : "text-[#F1EDE5]/40"
                  }`}
                >
                  {item}
                </p>
              ))}
            </nav>
            <div className="p-4 sm:p-5">
              <p className="font-editorial text-[17px] text-[#F1EDE5]">
                Performance Overview
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
                {KPIS.map((kpi) => (
                  <div key={kpi.label} className="border border-[#F1EDE5]/10 p-3">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-[#F1EDE5]/45">
                      {kpi.label}
                    </p>
                    <p className="tnum mt-1.5 text-[17px] font-medium text-[#F1EDE5]">
                      {kpi.value}{" "}
                      <span className="text-[10.5px] text-[#83A978]">{kpi.delta}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid gap-2 xl:grid-cols-[1.5fr_1fr]">
                <div className="border border-[#F1EDE5]/10 p-3">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-[#F1EDE5]/45">
                    Reservations over time
                  </p>
                  <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden>
                    <path d={`${path} L${W},${H} L0,${H} Z`} fill="#83A978" opacity="0.12" />
                    <path d={path} fill="none" stroke="#83A978" strokeWidth="2" />
                  </svg>
                </div>
                <div className="border border-[#F1EDE5]/10 p-3">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-[#F1EDE5]/45">
                    Channel mix
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {CHANNELS.map((c) => (
                      <li key={c.label} className="text-[10px] text-[#F1EDE5]/60">
                        <span className="flex justify-between">
                          <span>{c.label}</span>
                          <span className="tnum text-[#F1EDE5]/80">{c.pct}%</span>
                        </span>
                        <span className="mt-1 block h-[3px] bg-[#F1EDE5]/10">
                          <span
                            className="block h-full bg-[#83A978]"
                            style={{ width: `${c.pct}%` }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border border-[#F1EDE5]/10 px-3 py-2.5 text-[10px]">
                <span className="text-[#F1EDE5]/45 uppercase tracking-[0.14em]">Top campaign</span>
                <span className="text-[#F1EDE5]">Summer Chef Series</span>
                <span className="text-[#83A978]">Active</span>
                <span className="tnum text-[#F1EDE5]/70">$18,560 · 312 res. · 7.2×</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
