import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/studio/session";
import { clientHistory, getClient, projectsForClient, proposalsForClient } from "@/lib/studio/clients";
import { archiveClientAction, deleteClientAction } from "@/lib/studio/actions";
import { STAGE_LABELS } from "@/lib/studio/types";
import { isConfigured } from "@/lib/db";
import "../../studio.css";

export const metadata: Metadata = { title: "Client | The Pass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mismatch?: string }>;
}) {
  if (!isConfigured()) redirect("/studio/login");
  if (!(await getSessionEmail())) redirect("/studio/login");

  const { id } = await params;
  const { mismatch } = await searchParams;
  const client = await getClient(id);
  if (!client) notFound();
  const [projects, proposals, history] = await Promise.all([
    projectsForClient(id),
    proposalsForClient(id),
    clientHistory(id),
  ]);
  const isArchived = Boolean(client.archived_at);

  return (
    <div className="st-shell">
      <div className="st-wrap" style={{ maxWidth: 720 }}>
        <header className="st-top">
          <div>
            <p className="st-eyebrow">{isArchived ? "Archived client" : "Client"}</p>
            <h1>{client.name}</h1>
          </div>
          <Link href="/studio">Back</Link>
        </header>

        <div className="st-grid">
          <section className="st-card">
            <h2>Details</h2>
            <div className="st-row">
              <div className="st-row-main">
                <div className="st-row-meta">
                  {client.contact_name ?? "No contact name"}
                  {client.contact_email ? ` · ${client.contact_email}` : ""}
                  {client.segment ? ` · ${client.segment}` : ""}
                </div>
              </div>
            </div>
          </section>

          <section className="st-card">
            <h2>Projects</h2>
            {projects.length === 0 ? (
              <p className="st-note" style={{ marginTop: ".5rem" }}>None yet.</p>
            ) : (
              <div style={{ marginTop: ".4rem" }}>
                {projects.map((p) => (
                  <div className="st-row" key={p.id}>
                    <div className="st-row-main">
                      <strong>{p.name}</strong>
                      <div className="st-row-meta">{STAGE_LABELS[p.stage]}</div>
                    </div>
                    <div className="st-row-side">
                      <Link className="st-btn" data-ghost href={`/studio/projects/${p.id}`}>Open</Link>
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
                None linked yet. Generated quotes attach here when you pick this client on
                the proposal form; the hand-built ones live at their own URLs.
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
                      <a className="st-btn" data-ghost href={`/proposals/${q.slug}`} target="_blank" rel="noopener">View</a>
                      <Link className="st-btn" href={`/studio/proposals/new?slug=${q.slug}`}>Edit</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* The record of what has actually happened, newest first.
              Derived from the real rows rather than an events table, so
              it cannot drift out of step with them. */}
          <section className="st-card">
            <h2>History</h2>
            {history.length === 0 ? (
              <p className="st-note" style={{ marginTop: ".5rem" }}>Nothing yet.</p>
            ) : (
              <div style={{ marginTop: ".4rem" }}>
                {history.map((e, i) => (
                  <div className="st-row" key={`${e.at}-${i}`}>
                    <div className="st-row-main">
                      <strong>{e.title}</strong>
                      <div className="st-row-meta">
                        {new Date(e.at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                        {e.detail ? ` · ${e.detail}` : ""}
                      </div>
                    </div>
                    {e.href && (
                      <div className="st-row-side">
                        <a className="st-btn" data-ghost href={e.href}>Open</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Archive is the reversible one and comes first, because it is
              almost always the right answer. */}
          <section className="st-card">
            <h2>{isArchived ? "Restore" : "Archive"}</h2>
            <p className="st-note" style={{ margin: ".4rem 0 .8rem" }}>
              {isArchived
                ? "Puts this client back on the board with all its history."
                : "Takes this client off the board and out of search, keeping every project, round and note. Reversible at any time."}
            </p>
            <form action={archiveClientAction}>
              <input type="hidden" name="client_id" value={client.id} />
              <input type="hidden" name="archived" value={isArchived ? "0" : "1"} />
              <button className="st-btn" data-ghost type="submit">
                {isArchived ? "Restore client" : "Archive client"}
              </button>
            </form>
          </section>

          <section className="st-card" style={{ borderColor: "var(--red)" }}>
            <h2>Delete permanently</h2>
            <p className="st-note" style={{ margin: ".4rem 0 .8rem" }}>
              Removes this client and every project, review round and client note underneath
              it. There is no undo and no copy kept. Archiving does what you probably want.
            </p>
            {mismatch && (
              <p className="st-error" style={{ marginBottom: ".6rem" }}>
                That didn&rsquo;t match. Nothing was deleted.
              </p>
            )}
            <form className="st-form" action={deleteClientAction}>
              <input type="hidden" name="client_id" value={client.id} />
              <input type="hidden" name="client_name" value={client.name} />
              <label className="st-field">
                <span>Type &ldquo;{client.name}&rdquo; to confirm</span>
                <input name="confirm_name" autoComplete="off" required />
              </label>
              <button className="st-btn" type="submit" style={{ background: "var(--red)", justifySelf: "start" }}>
                Delete permanently
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
