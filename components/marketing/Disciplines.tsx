import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Feather,
  Globe,
  MousePointerClick,
  Search,
  Target,
} from "lucide-react";

const DISCIPLINES: {
  icon: LucideIcon;
  label: string;
  detail: string;
}[] = [
  {
    icon: Compass,
    label: "Strategy",
    detail: "Market intelligence, positioning, and growth roadmaps built for your reality.",
  },
  {
    icon: Feather,
    label: "Creative",
    detail: "Stories, content, and campaigns that build preference and authenticity.",
  },
  {
    icon: Globe,
    label: "Digital Experiences",
    detail: "Custom websites and experiences that convert and endure.",
  },
  {
    icon: Search,
    label: "SEO / AEO",
    detail: "Search visibility and entity authority that deliver qualified demand — on Google and in AI answers.",
  },
  {
    icon: Target,
    label: "Paid Media",
    detail: "Precision media that captures intent and maximizes return.",
  },
  {
    icon: MousePointerClick,
    label: "Conversion",
    detail: "Measurement, testing, and optimization across the guest journey.",
  },
];

/**
 * The six disciplines as a connected editorial sequence — fine rules and a
 * shared line, not six rounded cards. Hover deepens each stage.
 */
export function Disciplines() {
  return (
    <section
      id="growth-management"
      className="scroll-mt-24 bg-[#F1EDE5] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-[1400px]">
        <p className="mk-label text-[#4B1719]">Growth Management</p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <h2 className="font-editorial text-[38px] leading-[1.06] text-[#0A0A09] sm:text-[52px]">
            Strategy. Creative. Technology.
            <br />
            <em className="italic text-[#4B1719]">All in service of the guest.</em>
          </h2>
          <p className="max-w-[420px] self-end text-[15px] leading-relaxed text-[#1A1310]/75">
            Madison Four brings restaurant strategy, creative, media, websites,
            and conversion into one connected growth system. Every decision is
            grounded in how guests discover, choose, and return to a
            restaurant.
          </p>
        </div>

        <div className="relative mt-16">
          {/* The connecting line the disciplines hang from. */}
          <div aria-hidden className="absolute inset-x-0 top-[13px] hidden h-px bg-[#0A0A09]/15 lg:block" />
          <ol className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-6">
            {DISCIPLINES.map(({ icon: Icon, label, detail }, i) => (
              <li key={label} className="group relative">
                <span
                  aria-hidden
                  className="relative z-10 inline-flex h-[27px] w-[27px] items-center justify-center bg-[#F1EDE5] text-[#0A0A09] transition-colors group-hover:text-[#4B1719]"
                >
                  <Icon size={19} strokeWidth={1.5} />
                </span>
                <p className="mk-label mt-5 text-[#0A0A09]">
                  <span aria-hidden className="mr-2 font-editorial italic normal-case tracking-normal text-[#B79A68]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {label}
                </p>
                <span
                  aria-hidden
                  className="mt-3 block h-px w-8 bg-[#B79A68]/60 transition-all duration-300 group-hover:w-full"
                />
                <p className="mt-3 text-[13px] leading-relaxed text-[#1A1310]/70">
                  {detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
