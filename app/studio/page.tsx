import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/studio/session";
import { listProjects } from "@/lib/studio/clients";
import { listProposals } from "@/lib/studio/proposals";
import { STAGE_LABELS } from "@/lib/studio/types";
import { isConfigured } from "@/lib/db";
import "./studio.css";

export const metadata: Metadata = {
  title: "Studio | The Pass",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudioHome() {
  if (!isConfigured()) redirect("/studio/login");
  const email = await getSessionEmail();
  if (!email) redirect("/studio/login");

  const [projects, proposals] = await Promise.all([listProjects(), listProposals()]);
  const waiting = projects.filter((p) => p.open_comments > 0);

  return (
    <div className="st-shell">
      <div className="st-wrap">
        <header className="st-top">
          <div>
            <p className="st-eyebrow">The Pass</p>
            <h1>Studio</h1>
          </div>
          <Link href="/studio/proposals/new">New proposal</Link>
          <Link href="/studio/clients/new">New client</Link>
          <form method="post" action="/api/studio/logout">
            <button type="submit">Sign out</button>
          </form>
        </header>

        <div className="st-grid">
          {/* What is actually waiting on the studio, first. A dashboard
              that opens on a chart tells you nothing you have to act on. */}
          <section className="st-card">
            <h2>Needs you</h2>
            {waiting.length === 0 ? (
              <p className="st-note" style={{ marginTop: ".5rem" }}>
                Nothing unread. Every client note has been dealt with.
              </p>
            ) : (
              <div style={{ marginTop: ".4rem" }}>
                {waiting.map((p) => (
                  <div className="st-row" key={p.id}>
                    <div className="st-row-main">
                      <strong>{p.client_name}</strong>
                      <div className="st-row-meta">
                        {p.name} · round {p.latest_round ?? 1}
                      </div>
                    </div>
                    <div className="st-row-side">
                      <span className="st-chip" data-tone="hot">
                        {p.open_comments} unread
                      </span>
                      <Link className="st-btn" href={`/studio/projects/${p.id}`}>Open</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="st-card">
            <h2>Website projects</h2>
            {projects.length === 0 ? (
              <p className="st-note" style={{ marginTop: ".5rem" }}>
                No projects yet. Add a client, then a project, then send a review link.
              </p>
            ) : (
              <div style={{ marginTop: ".4rem" }}>
                {projects.map((p) => (
                  <div className="st-row" key={p.id}>
                    <div className="st-row-main">
                      <strong>{p.client_name}</strong>
                      <div className="st-row-meta">
                        {p.name}
                        {p.monthly_fee ? ` · $${Number(p.monthly_fee).toFixed(0)}/mo` : ""}
                        {p.mock_path ? ` · ${p.mock_path}` : " · no mock attached"}
                      </div>
                    </div>
                    <div className="st-row-side">
                      <span className="st-chip" data-tone={p.stage === "live" ? "live" : undefined}>
                        {STAGE_LABELS[p.stage]}
                      </span>
                      {p.latest_token && p.latest_status === "open" && (
                        <a className="st-btn" data-ghost href={`/review/${p.latest_token}`} target="_blank" rel="noopener">
                          Review link
                        </a>
                      )}
                      <Link className="st-btn" href={`/studio/projects/${p.id}`}>Open</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="st-card">
            <h2>Proposals</h2>
            {proposals.length === 0 ? (
              <p className="st-note" style={{ marginTop: ".5rem" }}>
                None generated yet. The two hand-built ones (Hals, Rebellion) still live
                at their own URLs and are not listed here.
              </p>
            ) : (
              <div style={{ marginTop: ".4rem" }}>
                {proposals.map((q) => (
                  <div className="st-row" key={q.id}>
                    <div className="st-row-main">
                      <strong>{q.company}</strong>
                      <div className="st-row-meta">
                        /proposals/{q.slug}
                        {q.monthly_fee ? ` · $${Number(q.monthly_fee).toFixed(0)}/mo` : ""}
                      </div>
                    </div>
                    <div className="st-row-side">
                      <a className="st-btn" data-ghost href={`/proposals/${q.slug}`} target="_blank" rel="noopener">
                        View
                      </a>
                      <Link className="st-btn" href={`/studio/proposals/new?slug=${q.slug}`}>Edit</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <p className="st-note" style={{ marginTop: "1.4rem" }}>Signed in as {email}.</p>
      </div>
    </div>
  );
}
