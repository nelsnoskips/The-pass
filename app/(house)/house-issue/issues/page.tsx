import Link from "next/link";
import { Masthead } from "@/components/house/Masthead";
import { ISSUES, currentIssue, issueLabel } from "@/lib/house";

export const metadata = { title: "The Archive — HOUSE ISSUE" };

/**
 * The archive. A deli's site usually has nothing worth returning to;
 * this one accumulates. Each issue keeps its own permanent address, so
 * a seasonal menu or a collaboration stays shareable long after the
 * kitchen has moved on.
 */
export default function ArchivePage() {
  const current = currentIssue();
  const issues = [...ISSUES].sort((a, b) => b.number - a.number);

  return (
    <>
      <Masthead issue={current.number} dated={current.dated} />

      <main id="main" className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8">
        <p className="hse-label text-[#B3352A]">The Archive</p>
        <h2 className="hse-display mt-5 max-w-[900px] text-[clamp(34px,5.5vw,68px)]">
          Every issue we have published.
        </h2>
        <p className="mt-6 max-w-[620px] text-[15px] leading-relaxed text-[#14120F]/75">
          Seasonal menus, collaborations, and runs of goods, numbered in
          the order they happened. Nothing here is taken down; a menu we
          cooked in August is a record of what August tasted like.
        </p>

        <ol className="mt-16">
          {issues.map((i) => (
            <li key={i.number} className="hse-rule-heavy py-10">
              <div className="grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-baseline lg:gap-14">
                <p className="hse-display hse-num text-[clamp(40px,6vw,72px)] leading-none text-[#B3352A] lg:w-[180px]">
                  {issueLabel(i.number)}
                </p>
                <div>
                  <p className="hse-label text-[#14120F]/50">
                    {i.dated}
                    {i.current && (
                      <span className="ml-3 text-[#B3352A]">Current</span>
                    )}
                  </p>
                  <h3 className="hse-display mt-3 max-w-[640px] text-[clamp(24px,3vw,34px)]">
                    {i.title}
                  </h3>
                  <p className="mt-3 max-w-[560px] text-[14px] leading-relaxed text-[#14120F]/70">
                    {i.standfirst}
                  </p>
                  <p className="hse-label mt-4 text-[#14120F]/45">
                    {i.sections.length} menus · {i.goods.length} goods
                  </p>
                </div>
                <Link
                  href={`/house-issue/issues/${i.number}`}
                  className="hse-label border border-[#14120F] px-6 py-3.5 transition-colors hover:bg-[#14120F] hover:text-[#F4F1EA]"
                >
                  Read {issueLabel(i.number)}
                </Link>
              </div>
            </li>
          ))}
        </ol>

        <p className="hse-rule pt-8 text-[13.5px] leading-relaxed text-[#14120F]/60">
          The next issue lands when the season turns, or sooner if someone
          brings us something worth cooking.
        </p>
      </main>
    </>
  );
}
