import clsx from "clsx";
import {
  STUDIO_EMAIL,
  getPortalClient,
  getPortalProject,
} from "@/lib/portal";

export const metadata = { title: "Design Rounds — The Pass" };

const ROUND_STATUS_LABEL = {
  current: "Current round",
  superseded: "Superseded",
  approved: "Approved",
} as const;

/**
 * Design rounds, newest first. Each round is a live staging site; feedback
 * goes by email until in-portal annotation ships.
 */
export default function RoundsPage() {
  const client = getPortalClient();
  const project = getPortalProject();
  const rounds = [...project.rounds].sort((a, b) => b.number - a.number);

  const feedbackHref = (roundNumber: number) =>
    `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(
      `Round ${roundNumber} feedback: ${client.restaurant}`,
    )}`;

  return (
    <>
      <p className="mk-label text-[#4B1719]">Design Rounds</p>
      <h1 className="mt-5 font-editorial text-[36px] leading-[1.06] text-[#0A0A09] sm:text-[46px]">
        Every round, plated on a{" "}
        <em className="italic text-[#4B1719]">live staging site.</em>
      </h1>
      <p className="mt-5 max-w-[540px] text-[15px] leading-relaxed text-[#1A1310]/75">
        Not flat mockups: each direction is a working website you can open
        on your phone, hand to your chef, and click through like a guest
        would. Tell us what feels right and what doesn&apos;t; your approval
        of a direction starts the build.
      </p>

      <ol className="mt-14 space-y-0 border-t border-[#0A0A09]/15">
        {rounds.map((round) => (
          <li
            key={round.number}
            className="grid gap-6 border-b border-[#0A0A09]/15 py-10 lg:grid-cols-[1fr_2fr_auto] lg:gap-12"
          >
            <div>
              <p
                className={clsx(
                  "mk-label",
                  round.status === "current"
                    ? "text-[#4B1719]"
                    : "text-[#1A1310]/45",
                )}
              >
                {ROUND_STATUS_LABEL[round.status]}
              </p>
              <p className="mt-3 font-editorial text-[30px] leading-none text-[#0A0A09]">
                Round {round.number}
              </p>
              <p className="mk-label mt-3 text-[#1A1310]/45">
                Posted {round.postedAt}
              </p>
            </div>
            <div>
              <p className="font-editorial text-[20px] italic text-[#0A0A09]">
                {round.title}
              </p>
              <p className="mt-3 max-w-[480px] text-[13.5px] leading-relaxed text-[#1A1310]/70">
                {round.note}
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 lg:items-end">
              <a
                href={round.stagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "mk-label group inline-flex items-center gap-3 px-6 py-3.5 transition-colors",
                  round.status === "current"
                    ? "bg-[#0A0A09] text-[#F1EDE5] hover:bg-[#4B1719]"
                    : "border border-[#0A0A09]/25 text-[#0A0A09] hover:border-[#0A0A09]",
                )}
              >
                View staging
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </a>
              {round.status === "current" && (
                <a
                  href={feedbackHref(round.number)}
                  className="mk-label border-b border-[#4B1719]/30 pb-0.5 text-[#4B1719] transition-colors hover:border-[#4B1719]"
                >
                  Send feedback
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-10 max-w-[540px] text-[13px] leading-relaxed text-[#1A1310]/60">
        Staging sites are private to this project and unlisted. They&apos;re
        retired once your site launches.
      </p>
    </>
  );
}
