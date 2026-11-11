import Link from "next/link";
import { ChangeCard } from "@/components/platform/ChangeCard";
import { ChatComposer } from "@/components/platform/ChatComposer";
import type { ChangeRow } from "@/lib/assistant";
import { db } from "@/lib/db";
import { menuNames } from "@/lib/levers";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const SUGGESTIONS = [
  "How does tonight look?",
  "Pause pickup orders for 20 minutes",
  "Let guests book up to 60 days ahead",
  "What are my reservation settings?",
];

/**
 * Chat: ask about the restaurant, or tell it what to change. Every change
 * shows as a card with before → after, applied or waiting for you.
 */
export default async function Chat({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ t?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, org: o } = await requireTenant(org);
  const sql = db()!;
  const threadId = q.t && /^[0-9a-f-]{36}$/i.test(q.t) ? q.t : null;
  const [threads, messages, changes, names] = await Promise.all([
    sql<{ id: string; title: string; updated_at: Date }[]>`
      select id, title, updated_at from chat_threads where org_id = ${tenant.orgId} order by updated_at desc limit 40`,
    threadId ? sql<{ id: string; role: "user" | "assistant"; body: string; created_at: Date }[]>`
      select id, role, body, created_at from chat_messages where thread_id = ${threadId} and org_id = ${tenant.orgId} order by created_at` : Promise.resolve([]),
    threadId ? sql<ChangeRow[]>`select * from chat_changes where thread_id = ${threadId} and org_id = ${tenant.orgId} order by created_at` : Promise.resolve([] as ChangeRow[]),
    menuNames(sql, tenant),
  ]);
  const byMessage = new Map<string, ChangeRow[]>();
  for (const c of changes) if (c.message_id) byMessage.set(c.message_id, [...(byMessage.get(c.message_id) ?? []), c]);
  const loose = changes.filter((c) => !c.message_id);
  const day = (d: Date) => {
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    return days < 1 ? "Today" : days < 30 ? "Past 30 days" : "Older";
  };
  const groups = new Map<string, { id: string; title: string; updated_at: Date }[]>();
  for (const th of threads) groups.set(day(th.updated_at), [...(groups.get(day(th.updated_at)) ?? []), th]);
  const decide = can(tenant, "view");

  return (
    <div className="pf-chat">
      <aside className="pf-chat-list" aria-label="Conversations">
        <Link href={`/r/${org}/chat`} className="pf-btn small" style={{ justifyContent: "center" }}>New chat</Link>
        {[...groups.entries()].map(([g, list]) => (
          <div key={g}>
            <p className="pf-side-h" style={{ padding: "0 8px", marginTop: 14 }}>{g}</p>
            {list.map((th) => (
              <Link key={th.id} href={`/r/${org}/chat?t=${th.id}`} className="pf-chat-thread" aria-current={th.id === threadId ? "page" : undefined}>{th.title}</Link>
            ))}
          </div>
        ))}
      </aside>

      <section className="pf-chat-main">
        {!threadId ? (
          <div className="pf-chat-welcome">
            <h1>What do you need?</h1>
            <p className="pf-sub">Ask about {o.name}, or tell it what to change. You&rsquo;ll see every change it makes, before and after — and nothing public, paid or guest-facing changes until you press Apply.</p>
            <ChatComposer org={org} thread={null} suggestions={SUGGESTIONS} autoFocus big />
          </div>
        ) : (
          <>
            <div className="pf-chat-log">
              {messages.map((m) => (
                <div key={m.id} className={`pf-turn ${m.role}`}>
                  <div className={`pf-bubble ${m.role === "user" ? "you" : "it"}`}>{m.body}</div>
                  {(byMessage.get(m.id) ?? []).map((c) => <ChangeCard key={c.id} c={c} org={org} thread={threadId} names={names} canDecide={decide} />)}
                </div>
              ))}
              {loose.map((c) => <ChangeCard key={c.id} c={c} org={org} thread={threadId} names={names} canDecide={decide} />)}
              {q.err && <p className="pf-msg err" role="alert">{q.err}</p>}
            </div>
            <div className="pf-chat-foot"><ChatComposer org={org} thread={threadId} /></div>
          </>
        )}
      </section>
    </div>
  );
}
