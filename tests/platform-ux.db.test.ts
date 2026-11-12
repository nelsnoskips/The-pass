import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { dismissAllFromAgent, proposalRecipients } from "@/lib/platform/approvals";
import { searchEverything } from "@/lib/platform/search";
import { listTables, saveTables } from "@/lib/platform/settings";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;
const NOW = new Date("2026-11-12T15:00:00Z"); // Thursday 10 AM in New York

d("platform UX against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  const orgs: string[] = [];
  let orgId = "", slug = "", venueId = "", otherOrg = "";
  let gia = "", ned = "", stranger = "", eightPm = "";
  let owner: Tenant, host: Tenant, other: Tenant;

  beforeAll(async () => {
    slug = `ux-${randomUUID().slice(0, 8)}`;
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('UX', ${slug}) returning id`;
    orgId = o.id; orgs.push(o.id);
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${orgId}, 'Main', 'main', 'America/New_York') returning id`;
    venueId = v.id;
    const guest = async (org: string, phone: string, name: string, consent: string | null, out: string | null = null) => {
      const [g] = await sql<{ id: string }[]>`
        insert into guests (org_id, phone, name, visit_count, last_visit_at, sms_consent_at, sms_consent_source, sms_opted_out_at)
        values (${org}, ${phone}, ${name}, 4, '2026-09-01T23:00:00Z', ${consent}, ${consent ? "booking form" : null}, ${out}) returning id`;
      return g.id;
    };
    gia = await guest(orgId, "+13055550901", "Gia Guest", "2026-08-01T12:00:00Z");
    ned = await guest(orgId, "+13055550902", "Ned Noconsent", null);
    const [o2] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Elsewhere', ${`ux-${randomUUID().slice(0, 8)}`}) returning id`;
    otherOrg = o2.id; orgs.push(o2.id);
    stranger = await guest(otherOrg, "+13055550903", "Somebody Else", "2026-08-01T12:00:00Z");
    // 8 PM tonight in New York, and 6 PM tomorrow.
    const book = async (at: string, guestId: string) => {
      const [r] = await sql<{ id: string }[]>`
        insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, manage_token)
        values (${orgId}, ${venueId}, ${guestId}, 2, ${at}, ${at}::timestamptz + interval '90 minutes', 'booked', ${randomUUID()}) returning id`;
      return r.id;
    };
    eightPm = await book("2026-11-13T01:00:00Z", gia);
    await book("2026-11-13T23:00:00Z", ned);
    owner = { orgId, actor: "owner@ux.example", role: "owner", venueIds: null };
    host = { orgId, actor: "host@ux.example", role: "host", venueIds: null };
    other = { orgId: otherOrg, actor: "owner@else.example", role: "owner", venueIds: null };
    const propose = (agent: string, input: object) => sql`
      insert into agent_proposals (org_id, agent_id, tool, input, title, rationale)
      values (${orgId}, ${agent}, 'send_guest_sms', ${sql.json(input as never)}, 'Text guests', 'Quiet Tuesday')`;
    await propose("reservations", { guest_ids: [gia, ned, stranger], message: "Come in Tuesday", rationale: "" });
    await propose("reservations", { guest_ids: [gia], message: "Again", rationale: "" });
    await propose("reviews", { reply: "Thank you" });
  });

  afterAll(async () => {
    await sql`delete from orgs where id = any(${orgs}::uuid[])`;
    await sql.end();
  });

  it("lists a proposal's recipients from this org only, with consent", async () => {
    const r = await proposalRecipients(sql, owner, [gia, ned, stranger, "not-a-uuid"]);
    expect(r.map((x) => x.name).sort()).toEqual(["Gia Guest", "Ned Noconsent"]);
    const g = r.find((x) => x.id === gia)!;
    expect(g.canText).toBe(true);
    expect(g.consentSource).toBe("booking form");
    expect(g.lastVisitAt).toEqual(new Date("2026-09-01T23:00:00Z"));
    expect(r.find((x) => x.id === ned)!.canText).toBe(false);
    expect(await proposalRecipients(sql, other, [gia])).toEqual([]);
    expect(await proposalRecipients(sql, owner, "nope")).toEqual([]);
  });

  it("dismisses all of one agent's proposals, logged, for managers only", async () => {
    await expect(dismissAllFromAgent(sql, host, "reservations")).rejects.toBeInstanceOf(Forbidden);
    expect(await dismissAllFromAgent(sql, other, "reservations")).toBe(0);
    expect(await dismissAllFromAgent(sql, owner, "reservations")).toBe(2);
    const left = await sql<{ agent_id: string; status: string; decided_by: string | null }[]>`
      select agent_id, status, decided_by from agent_proposals where org_id = ${orgId} order by agent_id`;
    expect(left).toEqual([
      { agent_id: "reservations", status: "rejected", decided_by: "owner@ux.example" },
      { agent_id: "reservations", status: "rejected", decided_by: "owner@ux.example" },
      { agent_id: "reviews", status: "pending", decided_by: null },
    ]);
    const [entry] = await sql<{ actor: string; detail: { count: number; ids: string[] } }[]>`
      select actor, detail from change_log where org_id = ${orgId} and action = 'agent.proposals_dismissed_all'`;
    expect(entry.actor).toBe("owner@ux.example");
    expect(entry.detail.count).toBe(2);
    expect(entry.detail.ids).toHaveLength(2);
    expect(await dismissAllFromAgent(sql, owner, "reservations")).toBe(0);
  });

  it("finds bookings by time in the restaurant's timezone and links to the host stand with a highlight", async () => {
    const tonight = await searchEverything(sql, host, slug, "8pm", NOW);
    expect(tonight.map((h) => h.title)).toEqual(["Gia Guest ×2"]);
    expect(tonight[0].href).toBe(`/r/${slug}/host?date=2026-11-12&highlight=${eightPm}#res-${eightPm}`);
    expect(tonight[0].detail).toMatch(/8:00 PM · Booked$/);
    expect((await searchEverything(sql, host, slug, "tomorrow", NOW)).map((h) => h.title)).toEqual(["Ned Noconsent ×2"]);
    expect(await searchEverything(sql, host, slug, "tomorrow 8pm", NOW)).toEqual([]);
    expect((await searchEverything(sql, host, slug, "gia tonight", NOW)).map((h) => h.kind)).toEqual(["booking"]);
    const guests = await searchEverything(sql, host, slug, "Gia", NOW);
    expect(guests.find((h) => h.kind === "guest")?.detail).toBe("(305) 555-0901 · 4 visits");
  });

  it("saves several tables at once, or none", async () => {
    expect(await saveTables(sql, owner, venueId, [
      { label: "T1", area: "Window", minCovers: 1, maxCovers: 2, online: true, active: true },
      { label: "T2", area: "", minCovers: 2, maxCovers: 4, online: false, active: true },
    ])).toBeNull();
    const tables = await listTables(sql, owner, venueId);
    expect(tables.map((t) => t.label)).toEqual(["T1", "T2"]);
    // One bad row keeps the good one from saving too.
    const err = await saveTables(sql, owner, venueId, [
      { id: tables[0].id, label: "T1", area: "Patio", minCovers: 1, maxCovers: 2, online: true, active: true },
      { label: "T3", area: "", minCovers: 4, maxCovers: 2, online: true, active: true },
    ]);
    expect(err).toMatch(/^T3: /);
    expect((await listTables(sql, owner, venueId))[0].area).toBe("Window");
    await expect(saveTables(sql, host, venueId, [{ label: "T9", area: "", minCovers: 1, maxCovers: 2, online: true, active: true }])).rejects.toBeInstanceOf(Forbidden);
  });
});
