import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClientStatus } from "@/lib/studio/clients";
import { STAGE_LABELS, STAGE_ORDER, type ProjectStage } from "@/lib/studio/types";
import { isConfigured } from "@/lib/db";
import "./status.css";

export const metadata: Metadata = {
  title: "Where we're at | The Pass",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Archived is an internal state; a client should never see it on a rail. */
const RAIL: ProjectStage[] = STAGE_ORDER.filter((s) => s !== "archived");

const BLURB: Record<string, string> = {
  lead: "We're talking it through.",
  proposal_sent: "The quote is with you.",
  building: "We're building it.",
  in_review: "It's with you to mark up.",
  approved: "Signed off — preparing to launch.",
  live: "It's live.",
};

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isConfigured()) notFound();
  const s = await getClientStatus(token);
  if (!s) notFound();

  const here = RAIL.indexOf(s.stage);
  const openRound = s.rounds.find((r) => r.status === "open");

  return (
    <div className="cs-shell">
      <div className="cs-wrap">
        <p className="cs-eyebrow">{s.clientName}</p>
        <h1>{s.projectName}</h1>
        <p className="cs-sub">
          {BLURB[s.stage] ?? "In progress."} This page updates itself, so it&rsquo;s worth a
          bookmark rather than an email.
        </p>

        <div className="cs-rail">
          {RAIL.map((stage, i) => {
            const state = i < here ? "done" : i === here ? "current" : "todo";
            return (
              <div className="cs-step" key={stage} data-state={state}>
                <span className="cs-dot" aria-hidden />
                <div>
                  <strong>{STAGE_LABELS[stage]}</strong>
                  {state === "current" && <span>{BLURB[stage] ?? ""}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {s.rounds.length > 0 && (
          <>
            <p className="cs-eyebrow" style={{ marginTop: "2.4rem" }}>Review rounds</p>
            <div className="cs-rounds">
              {s.rounds.map((r) => (
                <div className="cs-round" key={r.round}>
                  <strong>Round {r.round}</strong>
                  {r.status === "open" ? (
                    <span className="cs-chip" data-tone="open">Open for your notes</span>
                  ) : r.status === "submitted" ? (
                    <span className="cs-chip">
                      {r.noteCount} note{r.noteCount === 1 ? "" : "s"} received
                      {r.submittedAt ? ` · ${when(r.submittedAt)}` : ""}
                    </span>
                  ) : (
                    <span className="cs-chip" data-tone="done">
                      Closed · {r.resolvedCount}/{r.noteCount} actioned
                    </span>
                  )}
                  {r.status === "open" && (
                    <a className="cs-btn" href={`/review/${r.token}`}>Open the review</a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <p className="cs-foot">
          {openRound
            ? "There's a round waiting for you above — click through, mark up anything you want changed, and press submit."
            : "Nothing needs you right now. We'll send a new round when there's something to look at."}
          <br />
          Questions in the meantime:{" "}
          <a href="mailto:nelson.schnebelen@gmail.com">nelson.schnebelen@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
