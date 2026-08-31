import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/studio/session";
import { getProject, markRoundsSeen, statusTokenFor } from "@/lib/studio/clients";
import { openRoundAction, resolveCommentAction, saveMocksAction, setStageAction } from "@/lib/studio/actions";
import { mocksFor } from "@/lib/studio/review";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/studio/types";
import { isConfigured } from "@/lib/db";
import "../../studio.css";

export const metadata: Metadata = { title: "Project | The Pass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isConfigured()) redirect("/studio/login");
  if (!(await getSessionEmail())) redirect("/studio/login");

  const { id } = await params;
  const data = await getProject(id);
  if (!data) notFound();
  const { project, rounds, comments } = data;

  // Opening the project is the act that makes its submitted rounds stop
  // being new. Doing it here rather than behind a button means the
  // marker cannot go stale while the work is obviously in hand.
  await markRoundsSeen(id);
  const statusToken = await statusTokenFor(id);

  const mocks = mocksFor(project);
  const picked = rounds.find((r) => r.chosen)?.chosen ?? null;
  const open = comments.filter((c) => !c.resolved);
  const done = comments.filter((c) => c.resolved);
  const liveRound = rounds.find((r) => r.status === "open");

  return (
    <div className="st-shell">
      <div className="st-wrap">
        <header className="st-top">
          <div>
            <p className="st-eyebrow">{project.client_name}</p>
            <h1>{project.name}</h1>
          </div>
          <Link href="/studio">Back</Link>
        </header>

        <div className="st-grid">
          <section className="st-card">
            <h2>Round</h2>
            <div className="st-row">
              <div className="st-row-main">
                <div className="st-row-meta">
                  {rounds.length === 0
                    ? "No review has been sent yet."
                    : `${rounds.length} round${rounds.length === 1 ? "" : "s"}. Latest is ${rounds[0].status}.`}
                </div>
                {liveRound && (
                  <div className="st-row-meta" style={{ marginTop: ".4rem" }}>
                    Review link:{" "}
                    <a href={`/review/${liveRound.token}`} target="_blank" rel="noopener">
                      /review/{liveRound.token}
                    </a>
                    {mocks.length > 1 && ` — showing ${mocks.length} directions`}
                  </div>
                )}
                {picked && (
                  <div className="st-row-meta" style={{ marginTop: ".4rem", color: "var(--ink)" }}>
                    Direction chosen: <strong>{picked}</strong>
                  </div>
                )}
                {statusToken && (
                  <div className="st-row-meta" style={{ marginTop: ".4rem" }}>
                    Client status page:{" "}
                    <a href={`/status/${statusToken}`} target="_blank" rel="noopener">
                      /status/{statusToken}
                    </a>
                    <br />
                    Safe to send once and forget — it stays valid and updates itself.
                  </div>
                )}
              </div>
              <div className="st-row-side">
                <form action={openRoundAction}>
                  <input type="hidden" name="project_id" value={project.id} />
                  <button className="st-btn" type="submit">
                    {rounds.length === 0 ? "Open round 1" : "Open next round"}
                  </button>
                </form>
              </div>
            </div>

            <form action={saveMocksAction} style={{ marginTop: ".9rem" }}>
              <input type="hidden" name="project_id" value={project.id} />
              <label className="st-field">
                <span>Mocks on the review link</span>
                <textarea
                  name="mocks"
                  rows={4}
                  placeholder={"Direction one /orravan-v1\nDirection two /orravan-v2"}
                  defaultValue={mocks.map((m) => `${m.label} ${m.path}`).join("\n")}
                />
              </label>
              <p className="st-note" style={{ margin: ".35rem 0 .6rem" }}>
                One per line: the label the client reads, then the path. Leave it
                empty and the link falls back to {project.mock_path ?? "nothing"}.
                More than one turns on the switcher and asks them to pick.
              </p>
              <button className="st-btn" data-ghost type="submit">Save mocks</button>
            </form>

            <form action={setStageAction} className="st-two" style={{ marginTop: ".8rem" }}>
              <input type="hidden" name="project_id" value={project.id} />
              <label className="st-field">
                <span>Stage</span>
                <select name="stage" defaultValue={project.stage}>
                  {STAGE_ORDER.map((s) => (
                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                  ))}
                </select>
              </label>
              <div style={{ alignSelf: "end" }}>
                <button className="st-btn" data-ghost type="submit">Update stage</button>
              </div>
            </form>
          </section>

          <section className="st-card">
            <h2>Client notes {open.length > 0 && <span className="st-chip" data-tone="hot">{open.length} open</span>}</h2>
            {comments.length === 0 ? (
              <p className="st-note" style={{ marginTop: ".5rem" }}>
                Nothing back yet. Send the review link and this fills up.
              </p>
            ) : (
              <div style={{ marginTop: ".4rem" }}>
                {[...open, ...done].map((c) => (
                  <div className="st-row" key={c.id} style={{ opacity: c.resolved ? 0.5 : 1 }}>
                    <div className="st-row-main">
                      <strong>{c.kind === "edit" ? "Text edit" : "Comment"}</strong>
                      <div className="st-row-meta">
                        round {c.round} · {c.page_path}
                        {c.author ? ` · ${c.author}` : ""}
                      </div>
                      {c.kind === "edit" && (
                        <div className="st-row-meta" style={{ marginTop: ".35rem" }}>
                          <div><em>was</em> {c.original_text}</div>
                          <div><em>now</em> {c.suggested_text}</div>
                        </div>
                      )}
                      {c.body && (
                        <div className="st-row-meta" style={{ marginTop: ".35rem", color: "var(--ink)" }}>
                          {c.body}
                        </div>
                      )}
                    </div>
                    <div className="st-row-side">
                      <form action={resolveCommentAction}>
                        <input type="hidden" name="comment_id" value={c.id} />
                        <input type="hidden" name="project_id" value={project.id} />
                        <input type="hidden" name="resolved" value={c.resolved ? "0" : "1"} />
                        <button className="st-btn" data-ghost type="submit">
                          {c.resolved ? "Reopen" : "Done"}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
