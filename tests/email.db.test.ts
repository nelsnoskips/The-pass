import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
import { readUnsubscribeToken, sendEmailCampaign, unsubscribeEmail, unsubscribeToken, type EmailSender } from "@/lib/messaging/email";
import { book } from "@/lib/reservations/repo";
import { zonedToUtc } from "@/lib/reservations/time";

process.env.INTEGRATIONS_KEY ??= randomBytes(32).toString("base64");

describe("unsubscribe tokens", () => {
  it("round-trip, and can't be forged for another guest", () => {
    const a = randomUUID();
    const t = unsubscribeToken(a);
    expect(readUnsubscribeToken(t)).toBe(a);
    const other = Buffer.from(randomUUID()).toString("base64url");
    expect(readUnsubscribeToken(`${other}.${t.split(".")[1]}`)).toBeNull();
    expect(readUnsubscribeToken("garbage")).toBeNull();
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("email campaigns against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", venueId = "";
  const ids: Record<string, string> = {};
  const sent: { to: string; subject: string; text: string; unsubscribeUrl: string }[] = [];
  const sender: EmailSender = async (m) => { sent.push(m); return { status: "sent", providerId: "re_1" }; };

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Santorini', ${`em-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${orgId}, 'Main', 'main', 'America/New_York') returning id`;
    venueId = v.id;
    await sql`insert into dining_tables (org_id, venue_id, label, max_covers) values (${orgId}, ${venueId}, 'A', 2)`;
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating) values (${orgId}, ${venueId}, 'D', '{0,1,2,3,4,5,6}', '17:00', '21:00')`;
    const mk = async (k: string, email: string | null, consent: boolean, smsOnly = false) => {
      const [g] = await sql<{ id: string }[]>`
        insert into guests (org_id, phone, name, email, email_consent_at, sms_consent_at)
        values (${orgId}, ${`+1954555${String(Object.keys(ids).length).padStart(4, "0")}`}, ${`${k} Guest`}, ${email},
                ${consent ? new Date() : null}, ${smsOnly ? new Date() : null}) returning id`;
      ids[k] = g.id;
    };
    await mk("Ana", "ana@example.com", true);
    await mk("Ben", "ben@example.com", false, true);
    await mk("Cy", null, true);
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  const campaign = () => sendEmailCampaign(sql, {
    orgId, actor: "owner@em", guestIds: Object.values(ids), subject: "The terrace is open",
    body: "Come sit outside this week.", baseUrl: "https://pass.example",
  }, sender);

  it("emails only guests with email consent and an address, with a greeting and unsubscribe", async () => {
    expect(await campaign()).toEqual({ sent: 1, dry_run: 0, failed: 0, skipped: 2 });
    expect(sent[0].to).toBe("ana@example.com");
    expect(sent[0].text).toMatch(/^Hi Ana,/);
    expect(sent[0].text).toContain("https://pass.example/u/");
    expect(sent[0].unsubscribeUrl).toMatch(/^https:\/\/pass\.example\/api\/unsubscribe\//);
  });

  it("at most one campaign a week per guest", async () => {
    expect(await campaign()).toMatchObject({ sent: 0, skipped: 3 });
  });

  it("unsubscribing stops future email, and text consent is untouched", async () => {
    const token = sent[0].unsubscribeUrl.split("/").pop()!;
    expect(await unsubscribeEmail(sql, readUnsubscribeToken(token)!)).toEqual({ restaurant: "Santorini" });
    await sql`delete from guest_messages where org_id = ${orgId}`;
    expect(await campaign()).toMatchObject({ sent: 0 });
  });

  it("records email consent at booking only when ticked and an email is given", async () => {
    const at = (phone: string, email: string | null, emailMarketingConsent: boolean) => book(sql, {
      orgId, venueId, date: "2026-11-20", time: "17:00", partySize: 2,
      guest: { name: "New Guest", phone, email, emailMarketingConsent }, source: "website", actor: "guest", channel: "staff",
      now: zonedToUtc("2026-11-10", "12:00", "America/New_York"),
    });
    await at("954-555-7001", "new@example.com", true);
    await sql`update reservation_tables set live = false where org_id = ${orgId}`;
    await at("954-555-7002", null, true);
    const rows = await sql<{ phone: string; email_consent_at: Date | null }[]>`
      select phone, email_consent_at from guests where org_id = ${orgId} and phone in ('+19545557001', '+19545557002') order by phone`;
    expect(rows.map((r) => r.email_consent_at !== null)).toEqual([true, false]);
  });
});
