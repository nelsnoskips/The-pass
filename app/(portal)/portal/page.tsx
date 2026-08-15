import Link from "next/link";
import clsx from "clsx";
import {
  formatUsd,
  getCurrentRound,
  getNextPayment,
  getPortalClient,
  getPortalProject,
} from "@/lib/portal";

/**
 * The Project Room overview: where the project stands, in one glance.
 * Milestones hang from a shared line, matching the marketing site's
 * Disciplines idiom.
 */
export default function PortalHomePage() {
  const client = getPortalClient();
  const project = getPortalProject();
  const round = getCurrentRound(project);
  const payment = getNextPayment(project);
  const firstName = client.name.split(" ")[0];

  return (
    <>
      <p className="mk-label text-[#4B1719]">The Project Room</p>
      <h1 className="mt-5 font-editorial text-[36px] leading-[1.06] text-[#0A0A09] sm:text-[46px]">
        Good to see you,{" "}
        <em className="italic text-[#4B1719]">{firstName}.</em>
      </h1>
      <p className="mt-5 max-w-[540px] text-[15px] leading-relaxed text-[#1A1310]/75">
        {project.package} for {project.restaurant}, underway since{" "}
        {project.startedAt} and targeting launch {project.targetLaunch}.
        Everything about the project lives here.
      </p>

      <section aria-labelledby="milestones-heading" className="mt-16">
        <h2 id="milestones-heading" className="mk-label text-[#0A0A09]">
          Where things stand
        </h2>
        <div className="relative mt-8">
          <div
            aria-hidden
            className="absolute inset-x-0 top-[13px] hidden h-px bg-[#0A0A09]/15 lg:block"
          />
          <ol className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {project.milestones.map((m, i) => (
              <li key={m.key} className="relative">
                <span
                  aria-hidden
                  className={clsx(
                    "relative z-10 inline-flex h-[27px] w-[27px] items-center justify-center border bg-[#F1EDE5] font-editorial text-[15px]",
                    m.status === "complete" &&
                      "border-[#B79A68] bg-[#B79A68] text-[#0A0A09]",
                    m.status === "current" &&
                      "border-[#4B1719] text-[#4B1719]",
                    m.status === "upcoming" &&
                      "border-[#0A0A09]/25 text-[#1A1310]/45",
                  )}
                >
                  {m.status === "complete" ? "✓" : i + 1}
                </span>
                <p
                  className={clsx(
                    "mk-label mt-5",
                    m.status === "upcoming"
                      ? "text-[#1A1310]/45"
                      : "text-[#0A0A09]",
                  )}
                >
                  {m.title}
                  {m.status === "current" && (
                    <span className="ml-2 font-editorial italic normal-case tracking-normal text-[#4B1719]">
                      now
                    </span>
                  )}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-[#1A1310]/70">
                  {m.detail}
                </p>
                {(m.payment || m.date) && (
                  <p className="mk-label mt-4 text-[#1A1310]/45">
                    {[m.date, m.payment].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mt-16 grid gap-10 border-t border-[#0A0A09]/15 pt-12 lg:grid-cols-2 lg:gap-16">
        {round && (
          <section aria-labelledby="round-heading">
            <h2 id="round-heading" className="mk-label text-[#0A0A09]">
              On the pass now
            </h2>
            <p className="mt-4 font-editorial text-[26px] leading-tight text-[#0A0A09]">
              Round {round.number}: {round.title}
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-[#1A1310]/70">
              {round.note}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <a
                href={round.stagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mk-label group inline-flex items-center gap-3 bg-[#0A0A09] px-6 py-3.5 text-[#F1EDE5] transition-colors hover:bg-[#4B1719]"
              >
                View the staging site
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </a>
              <Link
                href="/portal/rounds"
                className="mk-label border-b border-[#4B1719]/30 pb-0.5 text-[#4B1719] transition-colors hover:border-[#4B1719]"
              >
                All rounds
              </Link>
            </div>
          </section>
        )}

        {payment && (
          <section aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="mk-label text-[#0A0A09]">
              Next payment
            </h2>
            <p className="mt-4 font-editorial text-[26px] leading-tight text-[#0A0A09]">
              {formatUsd(payment.amount)}
              <span className="ml-3 font-editorial text-[16px] italic text-[#4B1719]">
                {payment.label}
              </span>
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-[#1A1310]/70">
              {payment.date}. Nothing is ever due before you&apos;ve seen the
              work it pays for.
            </p>
            <Link
              href="/portal/billing"
              className="mk-label mt-6 inline-block border-b border-[#4B1719]/30 pb-0.5 text-[#4B1719] transition-colors hover:border-[#4B1719]"
            >
              Billing &amp; invoices
            </Link>
          </section>
        )}
      </div>
    </>
  );
}
