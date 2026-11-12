import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { book, cancelByToken, modifyByToken, seatWalkIn } from "@/lib/reservations/repo";
import { joinWaitlist, notifyWaitlist, sendDueReminders } from "@/lib/reservations/followups";
import { zonedToUtc } from "@/lib/reservations/time";
import type { SmsResult } from "@/lib/messaging/sms";
import type { Tenant } from "@/lib/platform/tenant";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;
const TZ = "America/New_York";
const FRI = "2026-11-13";
const NOW = zonedToUtc("2026-11-10", "12:00", TZ);

d("booking follow-ups", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  let orgId = "", venueId = "";
  let host: Tenant;
  const sent: { to: string; body: string }[] = [];
  const sender = async (to: string, body: string): Promise<SmsResult> => { sent.push({ to, body }); return { status: "sent", providerId: "SM" }; };
  let n = 0;
  const bookAt = (time: string, party = 2, date = FRI) =>
    book(sql, { orgId, venueId, date, time, partySize: party, guest: { name: `G${++n}`, phone: `+1305555${String(1000 + n)}` }, source: "website", actor: "guest", channel: "online", now: NOW });

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Follow', ${`fu-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${orgId}, 'Main', 'main', ${TZ}) returning id`;
    venueId = v.id;
    await sql`insert into dining_tables (org_id, venue_id, label, max_covers) values (${orgId}, ${venueId}, 'A', 2), (${orgId}, ${venueId}, 'B', 4)`;
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating, slot_minutes)
              values (${orgId}, ${venueId}, 'Dinner', '{2,3,4,5,6}', '17:00', '21:00', 30)`;
    await sql`insert into sites (org_id, venue_id, slug) values (${orgId}, ${venueId}, ${`fu-${randomUUID().slice(0, 8)}`})`;
    host = { orgId, actor: "host@fu", role: "host", venueIds: null };
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  it("moves a booking to a free time, keeping its own table if it fits", async () => {
    const r = await bookAt("17:00");
    if (!r.ok) throw new Error("setup");
    const moved = await modifyByToken(sql, r.reservation.manageToken, { date: FRI, time: "17:30", partySize: 2 }, NOW);
    expect(moved).toMatchObject({ ok: true, partySize: 2, tableLabel: "A" });
    const [row] = await sql<{ starts_at: Date; live: number }[]>`
      select r.starts_at, (select count(*)::int from reservation_tables where reservation_id = r.id and live) as live
      from reservations r where id = ${r.reservation.id}`;
    expect(row.starts_at.toISOString()).toBe(zonedToUtc(FRI, "17:30", TZ).toISOString());
    expect(row.live).toBe(1);
  });

  it("leaves the booking untouched when the new time is taken", async () => {
    const a = await bookAt("19:00", 4);
    const b = await bookAt("20:30", 4);
    if (!a.ok || !b.ok) throw new Error("setup");
    // The only four-top is held 19:00–20:45, so 20:00 can't fit a four.
    expect(await modifyByToken(sql, b.reservation.manageToken, { date: FRI, time: "20:00", partySize: 4 }, NOW))
      .toEqual({ ok: false, reason: "unavailable" });
    const [row] = await sql<{ starts_at: Date }[]>`select starts_at from reservations where id = ${b.reservation.id}`;
    expect(row.starts_at.toISOString()).toBe(zonedToUtc(FRI, "20:30", TZ).toISOString());
  });

  it("won't move a cancelled or seated booking", async () => {
    const r = await bookAt("18:00", 2, "2026-11-18");
    if (!r.ok) throw new Error("setup");
    await cancelByToken(sql, r.reservation.manageToken);
    expect(await modifyByToken(sql, r.reservation.manageToken, { date: "2026-11-18", time: "18:30", partySize: 2 }, NOW))
      .toEqual({ ok: false, reason: "not_changeable" });
    expect(await modifyByToken(sql, "nope", { date: FRI, time: "18:30", partySize: 2 }, NOW)).toEqual({ ok: false, reason: "not_found" });
  });

  it("reminds tomorrow's guests once, with their link, and never a walk-in", async () => {
    const SAT = "2026-11-14";
    const r = await bookAt("19:00", 2, SAT);
    if (!r.ok) throw new Error("setup");
    await seatWalkIn(sql, host, { venueId, partySize: 2, name: "", phone: "", now: zonedToUtc(SAT, "18:00", TZ) });
    const at = zonedToUtc("2026-11-13", "19:00", TZ); // 24h before
    sent.length = 0;
    // The job scans every restaurant; other tests share the database, so
    // count only what went to this restaurant's guests.
    const ours = () => sent.filter((m) => m.body.includes(`/booking/${r.reservation.manageToken}`) || m.to === r.reservation.guestPhone);
    await sendDueReminders(sql, "https://pass.example", at, sender);
    expect(ours()).toHaveLength(1);
    expect(ours()[0].to).toBe(r.reservation.guestPhone);
    expect(ours()[0].body).toContain("table for 2");
    await sendDueReminders(sql, "https://pass.example", at, sender);
    expect(ours()).toHaveLength(1); // not twice
    // The walk-in has no phone, so nothing for it at all.
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from guest_messages m join guests g on g.id = m.guest_id
      where m.org_id = ${orgId} and g.phone not like '+%'`;
    expect(n).toBe(0);
  });

  it("texts the waitlist in order when a table opens, at most three, then only once", async () => {
    const THU = "2026-11-12";
    // The only four-top, booked all night (four-tops turn in 105 min),
    // so no four fits anywhere; then one cancels.
    const blocker = await bookAt("17:00", 4, THU);
    const later = [await bookAt("19:00", 4, THU), await bookAt("21:00", 4, THU)];
    if (!blocker.ok || later.some((x) => !x.ok)) throw new Error("setup");
    for (let i = 0; i < 5; i++) {
      expect((await joinWaitlist(sql, { orgId, venueId, date: THU, partySize: 4, name: `W${i}`, phone: `+1786555000${i}` })).ok).toBe(true);
    }
    expect(await joinWaitlist(sql, { orgId, venueId, date: THU, partySize: 4, name: "x", phone: "12" })).toEqual({ ok: false, reason: "invalid_phone" });

    sent.length = 0;
    expect((await notifyWaitlist(sql, { orgId, venueId, date: THU, baseUrl: "https://pass.example", now: NOW }, sender)).notified).toBe(0);
    await cancelByToken(sql, blocker.reservation.manageToken);
    const r = await notifyWaitlist(sql, { orgId, venueId, date: THU, baseUrl: "https://pass.example", now: NOW }, sender);
    expect(r.notified).toBe(3);
    expect(sent.map((s) => s.to)).toEqual(["+17865550000", "+17865550001", "+17865550002"]);
    expect(sent[0].body).toContain(`reserve?date=${THU}&party=4`);
    sent.length = 0;
    expect((await notifyWaitlist(sql, { orgId, venueId, date: THU, baseUrl: "https://pass.example", now: NOW }, sender)).notified).toBe(2);
    expect((await notifyWaitlist(sql, { orgId, venueId, date: THU, baseUrl: "https://pass.example", now: NOW }, sender)).notified).toBe(0);
  });
});
