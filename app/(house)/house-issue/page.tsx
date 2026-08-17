import Link from "next/link";
import { Masthead } from "@/components/house/Masthead";
import { HOUSE, ISSUES, currentIssue, issueLabel } from "@/lib/house";

/**
 * The current issue. Order of business, deliberately: masthead, the
 * things a hungry person needs, the menu, then the editorial matter.
 * No scroll film here — this concept proves restraint.
 */
export default function HouseIssuePage() {
  const issue = currentIssue();
  const past = ISSUES.filter((i) => !i.current);

  return (
    <>
      <Masthead issue={issue.number} dated={issue.dated} />

      <main id="main">
        {/* The lede: what this issue is about. */}
        <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
            <div>
              <p className="hse-label text-[#B3352A]">
                Issue {issueLabel(issue.number)} · {issue.dated}
              </p>
              <h2 className="hse-display mt-5 text-[clamp(34px,5.5vw,68px)]">
                {issue.title}
              </h2>
              <p className="mt-6 max-w-[640px] text-[clamp(17px,2vw,21px)] leading-[1.5] text-[#14120F]/80">
                {issue.standfirst}
              </p>
              <p className="mt-5 max-w-[600px] text-[15px] leading-relaxed text-[#14120F]/70">
                {issue.lede}
              </p>
            </div>

            {/* PLATE: the issue photograph. Reserved, captioned, ruled. */}
            <figure>
              <div className="hse-plate hse-plate-empty aspect-[4/5]">
                <p className="hse-label px-6 text-center text-[#14120F]/40">
                  Plate 01
                  <br />
                  The rotisserie
                </p>
              </div>
              <figcaption className="hse-label mt-3 text-[#14120F]/50">
                Plate 01 · Birds on the spit, eleven in the morning
              </figcaption>
            </figure>
          </div>
        </section>

        {/* The menu, in columns, with dotted leaders. */}
        <section id="menu" className="scroll-mt-4 bg-[#14120F] py-16 text-[#F4F1EA]">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="hse-display text-[clamp(28px,4vw,44px)]">
                What we have today
              </h2>
              <p className="hse-label text-[#F4F1EA]/60">{HOUSE.kitchenNote}</p>
            </div>

            <div className="mt-12 grid gap-x-14 gap-y-12 lg:grid-cols-3">
              {issue.sections.map((s) => (
                <div key={s.title}>
                  <h3 className="hse-display text-[24px]">{s.title}</h3>
                  {s.note && (
                    <p className="hse-label mt-2 text-[#E0A99F]">{s.note}</p>
                  )}
                  <ul className="mt-6">
                    {s.items.map((item) => (
                      <li
                        key={item.name}
                        className="hse-line border-b-[rgba(244,241,234,0.2)]"
                      >
                        <span>
                          <span className="block text-[16px]">{item.name}</span>
                          <span className="mt-1 block text-[13px] leading-snug text-[#F4F1EA]/60">
                            {item.detail}
                          </span>
                        </span>
                        <span className="hse-num text-[15px] text-[#F4F1EA]/85">
                          {item.price}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div
              id="order"
              className="mt-14 flex flex-wrap items-center gap-6 border-t border-[#F4F1EA]/20 pt-10"
            >
              <a
                href={`tel:${HOUSE.phone.replace(/[^0-9]/g, "")}`}
                className="hse-label bg-[#B3352A] px-7 py-4 text-[#F4F1EA] transition-colors hover:bg-[#F4F1EA] hover:text-[#14120F]"
              >
                Call to order · {HOUSE.phone}
              </a>
              <p className="max-w-[420px] text-[13.5px] leading-relaxed text-[#F4F1EA]/65">
                Pickup only, twenty minutes most of the day, longer at noon.
                We would rather tell you the truth than take the order.
              </p>
            </div>
          </div>
        </section>

        {/* Goods from this issue. */}
        <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
          <div className="hse-rule-heavy flex flex-wrap items-baseline justify-between gap-4 pt-8">
            <h2 className="hse-display text-[clamp(28px,4vw,44px)]">
              Goods, {issueLabel(issue.number)}
            </h2>
            <Link href="/house-issue/goods" className="hse-link hse-label">
              Everything we sell →
            </Link>
          </div>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {issue.goods.map((g) => (
              <li key={g.name} className="hse-good">
                <div className="hse-plate hse-plate-empty aspect-square">
                  <p className="hse-label px-4 text-center text-[#14120F]/35">
                    {g.name}
                  </p>
                </div>
                <p className="mt-4 text-[15px]">{g.name}</p>
                <p className="mt-1 text-[13px] leading-snug text-[#14120F]/65">
                  {g.detail}
                </p>
                <p className="mt-3 flex items-baseline justify-between">
                  <span className="hse-num text-[15px]">${g.price}</span>
                  <span
                    className={
                      g.status === "sold out"
                        ? "hse-label text-[#14120F]/40"
                        : g.status === "low"
                          ? "hse-label text-[#B3352A]"
                          : "hse-label text-[#14120F]/55"
                    }
                  >
                    {g.status}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Editorial matter: the voice of the house. */}
        <section className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8">
          <div className="hse-rule-heavy grid gap-10 pt-8 lg:grid-cols-[auto_1fr] lg:gap-16">
            <h2 className="hse-label text-[#B3352A] lg:w-[180px]">
              From the counter
            </h2>
            <div className="grid gap-10 sm:grid-cols-2">
              {issue.notes.map((n) => (
                <article key={n.title}>
                  <h3 className="hse-display text-[22px]">{n.title}</h3>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-[#14120F]/75">
                    {n.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* The archive. */}
        <section className="mx-auto max-w-[1200px] px-5 pb-8 sm:px-8">
          <div className="hse-rule flex flex-wrap items-baseline justify-between gap-4 pt-8">
            <p className="hse-label text-[#14120F]/55">
              {past.length > 0
                ? `${past.length} issue${past.length === 1 ? "" : "s"} before this one`
                : "The first issue. The next one is already being cooked."}
            </p>
            <Link href="/house-issue/issues" className="hse-link hse-label">
              The archive →
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
