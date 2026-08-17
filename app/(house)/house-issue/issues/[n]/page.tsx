import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Masthead } from "@/components/house/Masthead";
import { ISSUES, currentIssue, getIssue, issueLabel } from "@/lib/house";

export function generateStaticParams() {
  return ISSUES.map((i) => ({ n: String(i.number) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const issue = getIssue(Number(n));
  if (!issue) return {};
  return {
    title: `Issue ${issueLabel(issue.number)}: ${issue.title} — HOUSE ISSUE`,
    description: issue.standfirst,
  };
}

/**
 * A single issue, kept at a permanent address so it stays shareable and
 * indexable after the kitchen moves on. This is what turns a seasonal
 * menu from a page that gets overwritten into a record.
 */
export default async function IssuePage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const issue = getIssue(Number(n));
  if (!issue) notFound();
  const current = currentIssue();

  return (
    <>
      <Masthead issue={current.number} dated={current.dated} />

      <main id="main" className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8">
        <Link href="/house-issue/issues" className="hse-link hse-label">
          ← The archive
        </Link>

        <p className="hse-label hse-num mt-10 text-[#B3352A]">
          Issue {issueLabel(issue.number)} · {issue.dated}
          {issue.current && <span className="ml-3">Current</span>}
        </p>
        <h2 className="hse-display mt-5 max-w-[900px] text-[clamp(34px,5.5vw,68px)]">
          {issue.title}
        </h2>
        <p className="mt-6 max-w-[640px] text-[clamp(17px,2vw,21px)] leading-[1.5] text-[#14120F]/80">
          {issue.standfirst}
        </p>
        <p className="mt-5 max-w-[600px] text-[15px] leading-relaxed text-[#14120F]/70">
          {issue.lede}
        </p>

        <div className="mt-16 grid gap-x-14 gap-y-12 lg:grid-cols-3">
          {issue.sections.map((s) => (
            <div key={s.title}>
              <h3 className="hse-display text-[24px]">{s.title}</h3>
              {s.note && <p className="hse-label mt-2 text-[#B3352A]">{s.note}</p>}
              <ul className="mt-6">
                {s.items.map((item) => (
                  <li key={item.name} className="hse-line">
                    <span>
                      <span className="block text-[16px]">{item.name}</span>
                      <span className="mt-1 block text-[13px] leading-snug text-[#14120F]/65">
                        {item.detail}
                      </span>
                    </span>
                    <span className="hse-num text-[15px]">{item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hse-rule-heavy mt-16 grid gap-10 pt-8 lg:grid-cols-[auto_1fr] lg:gap-16">
          <h3 className="hse-label text-[#B3352A] lg:w-[180px]">
            From the counter
          </h3>
          <div className="grid gap-10 sm:grid-cols-2">
            {issue.notes.map((note) => (
              <article key={note.title}>
                <h4 className="hse-display text-[22px]">{note.title}</h4>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[#14120F]/75">
                  {note.body}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="hse-rule-heavy mt-14 pt-8">
          <h3 className="hse-display text-[24px]">
            Goods in this issue
          </h3>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {issue.goods.map((g) => (
              <li key={g.name} className="hse-good">
                <p className="text-[15px]">{g.name}</p>
                <p className="mt-1 text-[13px] leading-snug text-[#14120F]/65">
                  {g.detail}
                </p>
                <p className="hse-num mt-3 text-[15px]">${g.price}</p>
              </li>
            ))}
          </ul>
          <Link href="/house-issue/goods" className="hse-link hse-label mt-8 inline-block">
            Everything we sell →
          </Link>
        </div>
      </main>
    </>
  );
}
