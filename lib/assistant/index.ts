import Anthropic from "@anthropic-ai/sdk";
import type { Sql } from "postgres";
import { DEFAULT_MODEL, type MessagesClient } from "../agent-runtime/runner";
import { formatLever, LEVERS, lever, menuNames, parseLeverValue, PILLARS, rawOf, readLevers, setLever, type LeverValue, type Pillar } from "../levers";
import { campaignResults, listCampaigns, saveDraft } from "../marketing/campaigns";
import { describeRules, listSegments, segmentCounts } from "../marketing/segments";
import { ordersBoard } from "../ordering";
import { assertCan, can, type Tenant } from "../platform/tenant";
import { localDate, zonedToUtc } from "../reservations/time";

/**
 * The assistant: a restaurant talks to it, it reads and changes the
 * business. Its only way to change anything is `change_setting`, over the
 * levers in lib/levers. Internal, reversible levers apply at once and can
 * be undone; public, money and on/off levers are written as a pending
 * change with the exact before → after, applied when a person presses
 * Apply. Either way the change is a row the person can see, and the lever
 * history on that part of the platform shows it too.
 *
 * The person in the chat is the actor: changes run with their own
 * permissions and are logged as theirs, via the assistant.
 */

export interface ChangeRow {
  id: string; pillar: Pillar; lever: string; label: string; value: string;
  before: LeverValue; after: LeverValue; risk: "auto" | "confirm";
  status: "applied" | "pending" | "undone" | "dismissed" | "failed";
  reason: string; error: string | null; requested_by: string; decided_by: string | null;
  created_at: Date; decided_at: Date | null; message_id: string | null;
}

type Ctx = { sql: Sql; tenant: Tenant; threadId: string; now: Date; changes: string[] };
interface Tool { name: string; description: string; input_schema: Anthropic.Beta.Messages.BetaTool["input_schema"]; run(ctx: Ctx, input: Record<string, unknown>): Promise<unknown> }

const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: "object" as const, properties, required, additionalProperties: false });

const TOOLS: Tool[] = [
  {
    name: "get_today",
    description: "Today at the restaurant: covers and bookings, online orders and sales, what's waiting for approval, whether pickup is paused. Money is integer cents.",
    input_schema: obj({}, []),
    async run({ sql, tenant, now }) {
      const [v] = await sql<{ id: string; name: string; timezone: string }[]>`select id, name, timezone from venues where org_id = ${tenant.orgId} order by created_at limit 1`;
      if (!v) return { error: "No venue yet." };
      const start = zonedToUtc(localDate(now, v.timezone), "00:00", v.timezone);
      const end = new Date(start.getTime() + 86_400_000);
      const [[b], [o], [p]] = await Promise.all([
        sql<{ covers: number; bookings: number }[]>`select coalesce(sum(party_size),0)::int as covers, count(*)::int as bookings from reservations
          where org_id = ${tenant.orgId} and status in ('booked','confirmed','seated','completed') and starts_at >= ${start} and starts_at < ${end}`,
        sql<{ orders: number; cents: number }[]>`select count(*)::int as orders, coalesce(sum(total_cents),0)::int as cents from orders
          where org_id = ${tenant.orgId} and status not in ('awaiting_payment','cancelled') and created_at >= ${start} and created_at < ${end}`,
        sql<{ n: number }[]>`select count(*)::int as n from agent_proposals where org_id = ${tenant.orgId} and status = 'pending'`,
      ]);
      return { venue: v.name, date: localDate(now, v.timezone), ...b, onlineOrders: o.orders, onlineSalesCents: o.cents, waitingForApproval: p.n };
    },
  },
  {
    name: "find_guests",
    description: "Look up guests by name, phone or email: visits, no-shows, last visit, notes.",
    input_schema: obj({ query: { type: "string" } }, ["query"]),
    async run({ sql, tenant }, { query }) {
      const q = `%${String(query).trim().slice(0, 60).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      const digits = String(query).replace(/\D/g, "");
      return sql`select name, phone, email, visit_count, no_show_count, last_visit_at, notes from guests
        where org_id = ${tenant.orgId} and (name ilike ${q} or email ilike ${q} or (${digits.length >= 4} and phone like ${`%${digits}%`}))
        order by last_visit_at desc nulls last limit 8`;
    },
  },
  {
    name: "list_bookings",
    description: "Bookings on a date (yyyy-mm-dd, the restaurant's local date): time, guest, party size, status, source.",
    input_schema: obj({ date: { type: "string" } }, ["date"]),
    async run({ sql, tenant }, { date }) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return { error: "Use yyyy-mm-dd." };
      const [v] = await sql<{ timezone: string }[]>`select timezone from venues where org_id = ${tenant.orgId} order by created_at limit 1`;
      if (!v) return [];
      const start = zonedToUtc(String(date), "00:00", v.timezone);
      return sql`select to_char(r.starts_at at time zone ${v.timezone}, 'HH24:MI') as time, g.name, r.party_size, r.status, r.source
        from reservations r join guests g on g.id = r.guest_id
        where r.org_id = ${tenant.orgId} and r.starts_at >= ${start} and r.starts_at < ${new Date(start.getTime() + 86_400_000)}
        order by r.starts_at limit 80`;
    },
  },
  {
    name: "list_open_orders",
    description: "Online orders that are open (new, being made, ready) plus today's finished ones.",
    input_schema: obj({}, []),
    async run({ sql, tenant, now }) {
      return (await ordersBoard(sql, tenant, now)).map((o) => ({ number: o.number, name: o.name, kind: o.kind, status: o.status, readyAt: o.readyAt, totalCents: o.totalCents, items: o.items.map((i) => `${i.qty}× ${i.name}`) }));
    },
  },
  {
    name: "get_settings",
    description: "The settings (levers) a part of the business runs on, with current values, what each does, and whether changing it applies at once or needs the owner to press Apply. For ordering, also the menu item ids (for sold_out).",
    input_schema: obj({ pillar: { type: "string", enum: ["reservations", "ordering", "website", "loyalty", "all"] } }, ["pillar"]),
    async run({ sql, tenant }, { pillar }) {
      const p = pillar === "all" ? undefined : (pillar as Pillar);
      const names = await menuNames(sql, tenant);
      const levers = (await readLevers(sql, tenant, p)).map(({ def, value }) => ({
        pillar: def.pillar, key: def.key, label: def.label, does: def.help, value, shown: formatLever(def, value, names),
        applies: def.risk === "auto" ? "at once (can be undone)" : "after the owner presses Apply",
        ...(def.min !== undefined ? { min: def.min, max: def.max, unit: def.unit } : {}),
        youCanChange: can(tenant, def.requires),
      }));
      return { levers, ...(p === "ordering" || !p ? { menu: [...names.entries()].map(([id, name]) => ({ id, name })) } : {}) };
    },
  },
  {
    name: "change_setting",
    description: "Change one setting from get_settings. value is text: a number for counts (no units), 'on'/'off' for switches, dollars for money, a percentage for tax, minutes for a pickup pause (0 resumes), comma-separated menu item ids for sold_out (the full new list). Say why in reason, in one plain sentence. Settings that apply at once are applied; the others are shown to the owner as a change to approve. Only call this when the owner asked for the change.",
    input_schema: obj({
      pillar: { type: "string", enum: ["reservations", "ordering", "website", "loyalty"] },
      key: { type: "string" }, value: { type: "string" }, reason: { type: "string" },
    }, ["pillar", "key", "value", "reason"]),
    async run(ctx, input) {
      const r = await proposeChange(ctx.sql, ctx.tenant, ctx.threadId, String(input.pillar), String(input.key), String(input.value), String(input.reason ?? ""), ctx.now);
      if ("id" in r && r.id) ctx.changes.push(r.id);
      return r;
    },
  },
  {
    name: "list_segments",
    description: "Saved guest segments (built-in and the restaurant's own): id, name, what the rules mean in plain English, and live counts of members and of those who said yes to texts and to emails.",
    input_schema: obj({}, []),
    async run({ sql, tenant, now }) {
      const segments = await listSegments(sql, tenant);
      return Promise.all(segments.map(async (s) => ({
        id: s.id, name: s.name, builtIn: s.builtin, rules: describeRules(s.rules), ...(await segmentCounts(sql, tenant, s.rules, now)),
      })));
    },
  },
  {
    name: "list_campaigns",
    description: "Recent SMS and email campaigns: name, status (draft, scheduled, sending, sent, failed), channel, segment, who wrote it, when, and for sent ones the results: recipients, sent, dry-run (recorded, not sent), failed, opted out since, and recipients who booked or ordered within 7 days (not proof the campaign caused it). Money is integer cents.",
    input_schema: obj({}, []),
    async run({ sql, tenant }) {
      const list = (await listCampaigns(sql, tenant)).slice(0, 20);
      return Promise.all(list.map(async (c) => ({
        id: c.id, name: c.name, status: c.status, channel: c.channel, segment: c.segment_name, createdBy: c.created_by,
        createdAt: c.created_at, scheduledFor: c.scheduled_for, sentAt: c.sent_at, results: await campaignResults(sql, tenant, c),
      })));
    },
  },
  {
    name: "draft_campaign",
    description: "Write a DRAFT text or email campaign to one segment (segment id from list_segments). It is never sent by this tool: the owner opens the link, sees exactly who it goes to, and sends or schedules it. Texts: under 300 characters, no opt-out line (added automatically). Emails need a subject (use an empty string for texts). Only call this when the owner asked for a campaign.",
    input_schema: obj({
      name: { type: "string" }, channel: { type: "string", enum: ["sms", "email"] }, segment: { type: "string" },
      subject: { type: "string" }, body: { type: "string" },
    }, ["name", "channel", "segment", "subject", "body"]),
    async run({ sql, tenant }, input) {
      if (!can(tenant, "message_guests")) return { error: "The person you're helping can't write campaigns." };
      const r = await saveDraft(sql, tenant, {
        name: String(input.name ?? ""), channel: String(input.channel ?? ""), segment: String(input.segment ?? ""),
        subject: String(input.subject ?? ""), body: String(input.body ?? ""),
      }, { createdBy: "agent:assistant" });
      if (!r.ok) return { error: r.error };
      const [o] = await sql<{ slug: string }[]>`select slug from orgs where id = ${tenant.orgId}`;
      return { id: r.id, status: "draft", link: `/r/${o.slug}/campaigns/${r.id}`, note: "Saved as a draft. Nothing was sent. The owner sends or schedules it from the link." };
    },
  },
];

/**
 * Record a change the assistant was asked to make. Auto levers are
 * applied now; confirm levers wait as "pending". Returns what the model
 * should tell the owner.
 */
export async function proposeChange(sql: Sql, t: Tenant, threadId: string, pillar: string, key: string, value: string, reason: string, now = new Date()) {
  const def = lever(pillar, key);
  if (!def) return { error: `Unknown setting ${pillar}.${key}. Call get_settings to see the options.` };
  if (!can(t, def.requires)) return { error: `The person you're helping can't change ${def.label.toLowerCase()}.` };
  const parsed = parseLeverValue(def, value);
  if (!parsed.ok) return { error: parsed.error };
  const current = (await readLevers(sql, t, def.pillar)).find((l) => l.def.key === key);
  if (!current) return { error: `${PILLARS[def.pillar].label} isn't set up yet.` };

  if (def.risk === "auto") {
    const r = await setLever(sql, t, def.pillar, def.key, value, "assistant", now);
    if (!r.ok) return { error: r.error };
    const [c] = await sql<{ id: string }[]>`
      insert into chat_changes (org_id, thread_id, pillar, lever, label, value, before, after, risk, status, reason, requested_by, decided_by, decided_at)
      values (${t.orgId}, ${threadId}, ${def.pillar}, ${def.key}, ${def.label}, ${value}, ${sql.json(r.before as never)}, ${sql.json(r.after as never)},
              'auto', 'applied', ${reason.slice(0, 300)}, ${t.actor}, ${t.actor}, now()) returning id`;
    return { id: c.id, status: "applied", setting: def.label, before: r.before, after: r.after, note: "Applied. The owner sees it with an Undo button." };
  }
  // The value it would become, for the card; nothing changes yet.
  let after: LeverValue = parsed.value;
  if (def.kind === "minutes_from_now") after = parsed.value ? new Date(now.getTime() + (parsed.value as number) * 60_000).toISOString() : null;
  if (JSON.stringify(current.value) === JSON.stringify(after)) return { error: `${def.label} is already ${formatLever(def, after)}.` };
  const [c] = await sql<{ id: string }[]>`
    insert into chat_changes (org_id, thread_id, pillar, lever, label, value, before, after, risk, status, reason, requested_by)
    values (${t.orgId}, ${threadId}, ${def.pillar}, ${def.key}, ${def.label}, ${value}, ${sql.json(current.value as never)}, ${sql.json(after as never)},
            'confirm', 'pending', ${reason.slice(0, 300)}, ${t.actor}) returning id`;
  return { id: c.id, status: "waiting_for_apply", setting: def.label, before: current.value, after, note: "Not changed yet: it's shown to the owner with an Apply button." };
}

/** A person presses Apply on a pending change. Re-validated against now. */
export async function applyChange(sql: Sql, t: Tenant, changeId: string, now = new Date()): Promise<{ ok: boolean; error?: string }> {
  const [c] = await sql<ChangeRow[]>`select * from chat_changes where id = ${changeId} and org_id = ${t.orgId} and status = 'pending'`;
  if (!c) return { ok: false, error: "That change was already decided." };
  const def = lever(c.pillar, c.lever)!;
  // If the setting moved since the card was made, the card is stale.
  const current = (await readLevers(sql, t, c.pillar)).find((l) => l.def.key === c.lever);
  if (current && def.kind !== "minutes_from_now" && JSON.stringify(current.value) !== JSON.stringify(c.before)) {
    await sql`update chat_changes set status = 'failed', error = 'The setting changed since this was proposed.', decided_by = ${t.actor}, decided_at = now() where id = ${c.id}`;
    return { ok: false, error: `${def.label} changed since this was proposed. Ask again.` };
  }
  const r = await setLever(sql, t, c.pillar, c.lever, c.value, "assistant", now);
  if (!r.ok) {
    await sql`update chat_changes set status = 'failed', error = ${r.error}, decided_by = ${t.actor}, decided_at = now() where id = ${c.id}`;
    return { ok: false, error: r.error };
  }
  await sql`update chat_changes set status = 'applied', before = ${sql.json(r.before as never)}, after = ${sql.json(r.after as never)},
            decided_by = ${t.actor}, decided_at = now() where id = ${c.id}`;
  return { ok: true };
}

export async function dismissChange(sql: Sql, t: Tenant, changeId: string): Promise<boolean> {
  assertCan(t, "view");
  const rows = await sql`update chat_changes set status = 'dismissed', decided_by = ${t.actor}, decided_at = now()
                         where id = ${changeId} and org_id = ${t.orgId} and status = 'pending' returning id`;
  return rows.length > 0;
}

/** Put an applied change back the way it was. */
export async function undoChange(sql: Sql, t: Tenant, changeId: string, now = new Date()): Promise<{ ok: boolean; error?: string }> {
  const [c] = await sql<ChangeRow[]>`select * from chat_changes where id = ${changeId} and org_id = ${t.orgId} and status = 'applied'`;
  if (!c) return { ok: false, error: "Only an applied change can be undone." };
  const def = lever(c.pillar, c.lever)!;
  const r = await setLever(sql, t, c.pillar, c.lever, rawOf(def, c.before), "assistant (undo)", now);
  if (!r.ok && !/already/.test(r.error)) return { ok: false, error: r.error };
  await sql`update chat_changes set status = 'undone', decided_by = ${t.actor}, decided_at = now() where id = ${c.id}`;
  return { ok: true };
}

const SYSTEM = `You are the assistant inside The Pass, the platform a restaurant uses to run its reservations, host stand, online ordering, website, guest list, loyalty and marketing. You are talking with a member of the restaurant's team.

Answer questions from the restaurant's real data using your tools; never guess numbers. When asked to change something, find the setting with get_settings and change it with change_setting. Some settings apply at once (the person can undo them); others are shown to the person as a change to approve with one click — say which happened. Only change what was asked. To write a text or email campaign, pick a segment with list_segments and save it with draft_campaign: it only saves a draft, so say that nothing was sent and give the link where the owner sends it. If something can't be done with your tools, say so plainly and say where in The Pass it's done.

Money in tool results is integer cents; write it in dollars. Keep replies short and specific: a sentence or two, or a short list. No filler.`;

export interface ChatTurn { reply: string; changes: string[] }

/** Answer one message in a thread, recording both sides and any changes. */
export async function chat(
  sql: Sql, t: Tenant, threadId: string, text: string, client: MessagesClient = new Anthropic(), now = new Date(),
): Promise<ChatTurn> {
  assertCan(t, "view");
  const history = await sql<{ role: "user" | "assistant"; body: string }[]>`
    select role, body from chat_messages where thread_id = ${threadId} and org_id = ${t.orgId} order by created_at desc limit 20`;
  await sql`insert into chat_messages (thread_id, org_id, role, body) values (${threadId}, ${t.orgId}, 'user', ${text})`;
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    ...history.reverse().map((m) => ({ role: m.role, content: m.body })),
    { role: "user", content: text },
  ];
  const ctx: Ctx = { sql, tenant: t, threadId, now, changes: [] };
  const tools = TOOLS.map((x) => ({ name: x.name, description: x.description, input_schema: x.input_schema, strict: true }));
  const byName = new Map(TOOLS.map((x) => [x.name, x]));
  let reply = "";
  for (let turn = 0; turn < 8; turn++) {
    const res = await client.beta.messages.create({
      model: DEFAULT_MODEL, max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      output_config: { effort: "low" }, cache_control: { type: "ephemeral" },
      system: SYSTEM, tools, messages,
    });
    messages.push({ role: "assistant", content: res.content });
    reply = res.content.filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    if (res.stop_reason === "pause_turn") continue;
    if (res.stop_reason !== "tool_use") break;
    const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
    for (const b of res.content) {
      if (b.type !== "tool_use") continue;
      const tool = byName.get(b.name);
      try {
        const out = tool ? await tool.run(ctx, (b.input ?? {}) as Record<string, unknown>) : { error: `Unknown tool ${b.name}.` };
        results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out ?? { ok: true }) });
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: b.id, is_error: true, content: err instanceof Error ? err.message : String(err) });
      }
    }
    messages.push({ role: "user", content: results });
  }
  if (!reply) reply = ctx.changes.length ? "Done — the changes are below." : "I couldn't finish that. Nothing was changed.";
  const [m] = await sql<{ id: string }[]>`insert into chat_messages (thread_id, org_id, role, body) values (${threadId}, ${t.orgId}, 'assistant', ${reply}) returning id`;
  if (ctx.changes.length) await sql`update chat_changes set message_id = ${m.id} where id = any(${ctx.changes}) and org_id = ${t.orgId}`;
  await sql`update chat_threads set updated_at = now() where id = ${threadId} and org_id = ${t.orgId}`;
  return { reply, changes: ctx.changes };
}

export async function newThread(sql: Sql, t: Tenant, firstMessage: string): Promise<string> {
  assertCan(t, "view");
  const title = firstMessage.trim().replace(/\s+/g, " ").slice(0, 60) || "New chat";
  const [th] = await sql<{ id: string }[]>`insert into chat_threads (org_id, title, created_by) values (${t.orgId}, ${title}, ${t.actor}) returning id`;
  return th.id;
}

export const LEVER_COUNT = LEVERS.length;
