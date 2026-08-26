import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/studio/session";
import { listArchivedClients, listClients, listProjects } from "@/lib/studio/clients";
import { archiveClientAction } from "@/lib/studio/actions";
import { listProposals } from "@/lib/studio/proposals";
import { STAGE_LABELS } from "@/lib/studio/types";
import { isConfigured } from "@/lib/db";
import "./studio.css";

export const metadata: Metadata = {
  title: "Studio | The Pass",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default async function StudioHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  if (!isConfigured()) redirect("/studio/login");
  const email = await getSessionEmail();
  if (!email) redirect("/studio/login");

  const { q = "", archived } = await searchParams;
  const [projects, clients, proposals, archivedClients] = await Promise.all([
    listProjects(q),
    listClients(q),
    listProposals(),
    archived ? listArchivedClients(q) : Promise.resolve([]),
  ]);
  // "New" beats "unresolved": something arriving since you last looked
  // is a different signal from work still outstanding.
  const waiting = projects.filter((p) => p.is_new || p.open_comments > 0);

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
          <Link href={archived ? "/studio" : "/studio?archived=1"}>
            {archived ? "Hide archived" : "Archived"}
          </Link>
          <form method="post" action="/api/studio/logout">
            <button type="submit">Sign out</button>
          </form>
        </header>

        <form method="get" action="/studio" className="st-field" style={{ marginBottom: "1.2rem" }}>
          {archived && <input type="hidden" name="archived" value="1" />}
          <span>Search</span>
          <input name="q" defaultValue={q} placeholder="Client or project name" />
        </form>

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
                        {p.latest_submitted_at ? ` · submitted ${ago(p.latest_submitted_at)}` : ""}
                      </div>
                    </div>
                    <div className="st-row-side">
                      {p.is_new && <span className="st-chip" data-tone="new">New</span>}
                      {p.open_comments > 0 && (
                        <span className="st-chip" data-tone="hot">{p.open_comments} unread</span>
                      )}
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
                      {p.is_new && <span className="st-chip" data-tone="new">New</span>}
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

          {/* The board is project-centric, so a client with no project
              would otherwise be created and never seen again. This is
              also the only route to archiving and deleting one. */}
          <section className="st-card">
            <h2>Clients</h2>
            {clients.length === 0 ? (
              <p className="st-note" style={{ marginTop: ".5rem" }}>
                {q ? "None matching that search." : "No clients yet."}
              </p>
            ) : (
              <div style={{ marginTop: ".4rem" }}>
                {clients.map((c) => {
                  const count = projects.filter((p) => p.client_id === c.id).length;
                  return (
                    <div className="st-row" key={c.id}>
                      <div className="st-row-main">
                        <strong>{c.name}</strong>
                        <div className="st-row-meta">
                          {c.segment ?? "—"}
                          {c.contact_name ? ` · ${c.contact_name}` : ""}
                          {` · ${count} project${count === 1 ? "" : "s"}`}
                        </div>
                      </div>
                      <div className="st-row-side">
                        <Link className="st-btn" data-ghost href={`/studio/clients/${c.id}`}>Manage</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {archived && (
            <section className="st-card">
              <h2>Archived clients</h2>
              {archivedClients.length === 0 ? (
                <p className="st-note" style={{ marginTop: ".5rem" }}>
                  Nothing archived{q ? " matching that search" : ""}.
                </p>
              ) : (
                <div style={{ marginTop: ".4rem" }}>
                  {archivedClients.map((c) => (
                    <div className="st-row" key={c.id}>
                      <div className="st-row-main">
                        <strong>{c.name}</strong>
                        <div className="st-row-meta">
                          {c.segment ?? "—"}{c.contact_name ? ` · ${c.contact_name}` : ""}
                        </div>
                      </div>
                      <div className="st-row-side">
                        <form action={archiveClientAction}>
                          <input type="hidden" name="client_id" value={c.id} />
                          <input type="hidden" name="archived" value="0" />
                          <button className="st-btn" data-ghost type="submit">Restore</button>
                        </form>
                        <Link className="st-btn" data-ghost href={`/studio/clients/${c.id}`}>Manage</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

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
