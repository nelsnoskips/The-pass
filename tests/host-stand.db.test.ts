import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { cancelOrder } from "@/lib/ordering";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";
import {
  blockingParty, dayBook, floorNow, reassignTable, seatChoices, seatWalkIn, setStatus, undoStatus,
} from "@/lib/reservations/repo";
import { localDate, zonedToUtc } from "@/lib/reservations/time";
import {
  addToWaitlist, notifyRequest, quoteWait, removeFromWaitlist, seatFromWaitlist, textTableReady, todaysRequests, waitingList,
} from "@/lib/reservations/waitlist";

/**
 * The host stand's guarantees, against a real Postgres: never two seated
 * parties at one table, late parties and the grace window, undo that
 * gives back exactly what it took, the walk-in waitlist, and a kitchen
 * cancel that needs a reason.
 */
const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

const NY = "America/New_York";
const DAY = "2026-11-13";
const at = (time: string) => zonedToUtc(DAY, time, NY);
const plus = (t: Date, min: number) => new Date(t.getTime() + min * 60_000);

/** A fixed-offset zone where it is around midday right now, so "today" is unambiguous for tests that run on the real clock. */
function middayZone(): string {
  const offset = 12 - new Date().getUTCHours();
  return offset >= 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${-offset}`;
}

d("host stand against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  const orgs: string[] = [];
  let n = 0;

  async function seedOrg(tz: string, tables: [string, number, number][]) {
    const [org] = await sql<{ id: string }[]>`
      insert into orgs (name, slug) values ('Host test', ${`host-${randomUUID().slice(0, 8)}`}) returning id`;
    orgs.push(org.id);
    const [venue] = await sql<{ id: string }[]>`
      insert into venues (org_id, name, slug, timezone) values (${org.id}, 'Main', 'main', ${tz}) returning id`;
    const ids: Record<string, string> = {};
    for (const [label, min, max] of tables) {
      const [t] = await sql<{ id: string }[]>`
        insert into dining_tables (org_id, venue_id, label, min_covers, max_covers)
        values (${org.id}, ${venue.id}, ${label}, ${min}, ${max}) returning id`;
      ids[label] = t.id;
    }
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating, slot_minutes)
      values (${org.id}, ${venue.id}, 'All day', '{0,1,2,3,4,5,6}', '00:00', '23:45', 15)`;
    const host: Tenant = { orgId: org.id, actor: "host@test", role: "host", venueIds: [venue.id] };
    return { orgId: org.id, venueId: venue.id, tables: ids, host };
  }

  /** A booking straight into the tables, so tests control the clock. */
  async function booking(o: { orgId: string; venueId: string }, tableId: string, startsAt: Date, opts: { party?: number; minutes?: number; name?: string } = {}) {
    n++;
    const end = plus(startsAt, opts.minutes ?? 90);
    const [g] = await sql<{ id: string }[]>`
      insert into guests (org_id, phone, name) values (${o.orgId}, ${`+1954555${String(1000 + n).slice(-4)}`}, ${opts.name ?? `Guest ${n}`})
      on conflict (org_id, phone) do update set name = excluded.name returning id`;
    const [r] = await sql<{ id: string }[]>`
      insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, source, manage_token)
      values (${o.orgId}, ${o.venueId}, ${g.id}, ${opts.party ?? 2}, ${startsAt}, ${end}, 'website', ${randomUUID()}) returning id`;
    await sql`insert into reservation_tables (reservation_id, table_id, org_id, during)
              values (${r.id}, ${tableId}, ${o.orgId}, tstzrange(${startsAt}, ${end}, '[)'))`;
    return { id: r.id, guestId: g.id };
  }

  afterAll(async () => {
    if (orgs.length) await sql`delete from orgs where id = any(${orgs})`;
    await sql.end();
  });

  describe("never two seated parties at one table", () => {
    let o: Awaited<ReturnType<typeof seedOrg>>;
    beforeAll(async () => { o = await seedOrg(NY, [["T1", 1, 2], ["T2", 1, 4], ["T9", 1, 8]]); });

    it("refuses to seat a party at a table someone is sitting at, and says who", async () => {
      const walk = await seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 2, name: "", phone: "", now: at("19:45"), tableId: o.tables.T1 });
      expect(walk).toMatchObject({ ok: true, tableLabel: "T1" });
      // A 6:00 booking on T1, 1h47 late; the walk-in sat after their grace window.
      const late = await booking(o, o.tables.T1, at("18:00"));
      await sql`update reservation_tables set live = false where reservation_id = ${late.id}`;
      expect(await setStatus(sql, o.host, late.id, "seated", { now: at("19:47") })).toBe("occupied");
      const who = await blockingParty(sql, o.host, late.id, at("19:47"));
      expect(who).toMatchObject({ tableLabel: "T1", guestName: "Walk-in", source: "walk_in" });
      // The picker offers the free tables, T1 marked taken.
      const choices = await seatChoices(sql, o.host, late.id, at("19:47"));
      expect(choices.find((c) => c.label === "T1")).toMatchObject({ free: false, occupiedBy: "Walk-in", current: true });
      expect(choices.find((c) => c.label === "T2")).toMatchObject({ free: true });
      // Seating them at T2 instead works, in one step.
      expect(await setStatus(sql, o.host, late.id, "seated", { now: at("19:47"), tableId: o.tables.T2 })).toBe("ok");
      const floor = await floorNow(sql, o.host, o.venueId, at("19:50"));
      expect(floor.filter((t) => t.occupant).map((t) => `${t.label}:${t.occupant!.guestName}`).sort()).toEqual(["T1:Walk-in", `T2:Guest ${n}`]);
    });

    it("won't seat at a table that's too small or held by another booking", async () => {
      const big = await booking(o, o.tables.T9, at("20:00"), { party: 6 });
      expect(await setStatus(sql, o.host, big.id, "seated", { now: at("20:00"), tableId: o.tables.T1 })).toBe("table_unavailable");
      const status = await sql<{ status: string }[]>`select status from reservations where id = ${big.id}`;
      expect(status[0].status).toBe("booked");
    });

    it("only seats on the day, and no-shows only after 15 minutes", async () => {
      const r = await booking(o, o.tables.T9, at("12:00"), { party: 2 });
      expect(await setStatus(sql, o.host, r.id, "seated", { now: zonedToUtc("2026-11-12", "12:00", NY) })).toBe("not_today");
      expect(await setStatus(sql, o.host, r.id, "no_show", { now: at("12:10") })).toBe("too_early");
      expect(await setStatus(sql, o.host, r.id, "no_show", { now: at("12:15") })).toBe("ok");
    });
  });

  describe("reassigning a table", () => {
    let o: Awaited<ReturnType<typeof seedOrg>>;
    beforeAll(async () => { o = await seedOrg(NY, [["A1", 1, 2], ["A2", 1, 2], ["B4", 2, 4]]); });

    it("moves a booking to another table, and logs it", async () => {
      const r = await booking(o, o.tables.A1, at("18:00"));
      expect(await reassignTable(sql, o.host, r.id, o.tables.B4, at("12:00"))).toBe("ok");
      const day = await dayBook(sql, o.host, o.venueId, DAY);
      expect(day.find((x) => x.id === r.id)?.tableLabels).toEqual(["B4"]);
      const [log] = await sql<{ detail: { from: string[]; to: string } }[]>`
        select detail from change_log where entity_id = ${r.id} and action = 'reservation.table_changed'`;
      expect(log.detail).toEqual({ from: ["A1"], to: "B4" });
    });

    it("refuses a table that's too small, double-booked or another restaurant's", async () => {
      const four = await booking(o, o.tables.B4, at("21:00"), { party: 4 });
      expect(await reassignTable(sql, o.host, four.id, o.tables.A2, at("12:00"))).toBe("table_unavailable");
      const two = await booking(o, o.tables.A2, at("18:30"));
      // B4 is held 18:00–19:30 by the first booking.
      expect(await reassignTable(sql, o.host, two.id, o.tables.B4, at("12:00"))).toBe("table_unavailable");
      const other = await seedOrg(NY, [["Z1", 1, 4]]);
      expect(await reassignTable(sql, other.host, two.id, other.tables.Z1, at("12:00"))).toBe("not_found");
      expect(await reassignTable(sql, o.host, two.id, other.tables.Z1, at("12:00"))).toBe("table_unavailable");
      const viewer: Tenant = { ...o.host, role: "viewer" };
      await expect(reassignTable(sql, viewer, two.id, o.tables.A1, at("12:00"))).rejects.toBeInstanceOf(Forbidden);
    });

    it("won't move a seated party onto a table with someone at it", async () => {
      const a = await booking(o, o.tables.A1, at("13:00"));
      const b = await booking(o, o.tables.A2, at("13:00"));
      expect(await setStatus(sql, o.host, a.id, "seated", { now: at("13:00") })).toBe("ok");
      expect(await setStatus(sql, o.host, b.id, "seated", { now: at("13:00") })).toBe("ok");
      expect(await reassignTable(sql, o.host, b.id, o.tables.A1, at("13:05"))).toBe("occupied");
    });
  });

  describe("walk-in auto-pick, late parties and the grace window", () => {
    let o: Awaited<ReturnType<typeof seedOrg>>;
    beforeAll(async () => { o = await seedOrg(NY, [["W1", 1, 2]]); });

    it("keeps the table for a party due within the turn", async () => {
      await booking(o, o.tables.W1, at("18:00"), { minutes: 75 });
      expect(await seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 2, name: "", phone: "", now: at("17:00") }))
        .toEqual({ ok: false, reason: "no_table" });
    });

    it("keeps it for a late party inside 30 minutes, even with a short hold", async () => {
      // Shrink their hold so only the grace rule protects it.
      await sql`update reservation_tables set during = tstzrange(${at("18:00")}, ${at("18:10")}, '[)')
                where table_id = ${o.tables.W1}`;
      expect(await seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 2, name: "", phone: "", now: at("18:25") }))
        .toEqual({ ok: false, reason: "no_table" });
    });

    it("lets a walk-in have it past the grace window, and tells the late party's row", async () => {
      await sql`update reservation_tables set during = tstzrange(${at("18:00")}, ${at("19:15")}, '[)')
                where table_id = ${o.tables.W1}`;
      const r = await seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 2, name: "", phone: "", now: at("18:31") });
      expect(r).toMatchObject({ ok: true, tableLabel: "W1" });
      const day = await dayBook(sql, o.host, o.venueId, DAY);
      const late = day.find((x) => x.source === "website")!;
      expect(late.tableReleased).toBe(true);
      // They turn up: the table is taken, so they can't be seated there.
      expect(await setStatus(sql, o.host, late.id, "seated", { now: at("18:40") })).toBe("occupied");
      // A second walk-in can't take the table a walk-in is sitting at.
      expect(await seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 2, name: "", phone: "", now: at("21:00") }))
        .toEqual({ ok: false, reason: "no_table" });
    });
  });

  describe("undo, within 15 minutes", () => {
    let o: Awaited<ReturnType<typeof seedOrg>>;
    const now = () => new Date();
    beforeAll(async () => {
      o = await seedOrg(middayZone(), [["U1", 1, 4], ["U2", 1, 4], ["U3", 1, 4], ["U4", 1, 4]]);
      await sql`insert into loyalty_programs (org_id, active, visits_required, reward) values (${o.orgId}, true, 2, 'Dessert')`;
    });

    it("seated → booked", async () => {
      const r = await booking(o, o.tables.U1, plus(now(), -5));
      expect(localDate(plus(now(), -5), middayZone())).toBe(localDate(now(), middayZone()));
      expect(await setStatus(sql, o.host, r.id, "seated")).toBe("ok");
      expect(await undoStatus(sql, o.host, r.id)).toBe("ok");
      const [x] = await sql<{ status: string }[]>`select status from reservations where id = ${r.id}`;
      expect(x.status).toBe("booked");
      expect(await undoStatus(sql, o.host, r.id)).toBe("invalid");
      const log = await sql<{ action: string; actor: string; detail: { from: string; to: string } }[]>`
        select action, actor, detail from change_log where entity_id = ${r.id} order by id desc limit 1`;
      expect(log[0]).toMatchObject({ action: "reservation.undo", actor: "host@test", detail: { from: "seated", to: "booked" } });
    });

    it("completed → seated gives back the visit and the reward it earned", async () => {
      const r = await booking(o, o.tables.U2, plus(now(), -60));
      await sql`update guests set visit_count = 1, last_visit_at = '2026-10-01T20:00:00Z' where id = ${r.guestId}`;
      await sql`update reservations set status = 'seated' where id = ${r.id}`;
      expect(await setStatus(sql, o.host, r.id, "completed")).toBe("ok");
      const [mid] = await sql<{ visit_count: number }[]>`select visit_count from guests where id = ${r.guestId}`;
      expect(mid.visit_count).toBe(2);
      expect(await sql`select 1 from loyalty_rewards where guest_id = ${r.guestId}`).toHaveLength(1);

      expect(await undoStatus(sql, o.host, r.id)).toBe("ok");
      const [g] = await sql<{ visit_count: number; last_visit_at: Date }[]>`select visit_count, last_visit_at from guests where id = ${r.guestId}`;
      expect(g.visit_count).toBe(1);
      expect(g.last_visit_at.toISOString()).toBe("2026-10-01T20:00:00.000Z");
      expect(await sql`select 1 from loyalty_rewards where guest_id = ${r.guestId}`).toHaveLength(0);
      const [x] = await sql<{ status: string }[]>`select status from reservations where id = ${r.id}`;
      expect(x.status).toBe("seated");
      const [hold] = await sql<{ live: boolean }[]>`select live from reservation_tables where reservation_id = ${r.id}`;
      expect(hold.live).toBe(true);
    });

    it("no_show → booked gives back the no-show and re-holds the table", async () => {
      const r = await booking(o, o.tables.U3, plus(now(), -20));
      expect(await setStatus(sql, o.host, r.id, "no_show")).toBe("ok");
      const [mid] = await sql<{ no_show_count: number }[]>`select no_show_count from guests where id = ${r.guestId}`;
      expect(mid.no_show_count).toBe(1);
      expect(await undoStatus(sql, o.host, r.id)).toBe("ok");
      const [g] = await sql<{ no_show_count: number }[]>`select no_show_count from guests where id = ${r.guestId}`;
      expect(g.no_show_count).toBe(0);
      const [hold] = await sql<{ live: boolean }[]>`select live from reservation_tables where reservation_id = ${r.id}`;
      expect(hold.live).toBe(true);
    });

    it("not after 15 minutes, not a walk-in, and not if it would double-seat", async () => {
      const r = await booking(o, o.tables.U4, plus(now(), -20));
      expect(await setStatus(sql, o.host, r.id, "no_show")).toBe("ok");
      await sql`update change_log set created_at = now() - interval '16 minutes' where entity_id = ${r.id} and action = 'reservation.no_show'`;
      expect(await undoStatus(sql, o.host, r.id)).toBe("expired");

      const w = await seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 2, name: "", phone: "" });
      if (!w.ok) throw new Error("setup");
      expect(await undoStatus(sql, o.host, w.reservationId)).toBe("invalid");

      // Done, then someone else sits at the table: Undo can't put them back.
      await sql`update reservations set status = 'cancelled' where venue_id = ${o.venueId} and status in ('booked', 'seated')`;
      await sql`update reservation_tables set live = false where org_id = ${o.orgId}`;
      const done = await booking(o, o.tables.U1, plus(now(), -3));
      await sql`update reservations set status = 'seated' where id = ${done.id}`;
      expect(await setStatus(sql, o.host, done.id, "completed")).toBe("ok");
      const next = await seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 2, name: "", phone: "", tableId: o.tables.U1 });
      expect(next).toMatchObject({ ok: true, tableLabel: "U1" });
      expect(await undoStatus(sql, o.host, done.id)).toBe("occupied");
    });
  });

  describe("the walk-in waitlist", () => {
    let o: Awaited<ReturnType<typeof seedOrg>>;
    const sent: { to: string; body: string }[] = [];
    const sender = async (to: string, body: string) => { sent.push({ to, body }); return { status: "dry_run" as const }; };
    beforeAll(async () => { o = await seedOrg(middayZone(), [["L1", 1, 4]]); });

    it("quotes a wait when nothing fits now", async () => {
      const w = await seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 4, name: "First", phone: "" });
      expect(w.ok).toBe(true);
      const quote = await quoteWait(sql, o.host, o.venueId, 2);
      expect(quote).toBeGreaterThanOrEqual(5);
      expect(quote).toBeLessThanOrEqual(120);
      expect(await quoteWait(sql, o.host, o.venueId, 9)).toBeNull();
    });

    it("adds, texts (transactional), seats once, and removes", async () => {
      expect(await addToWaitlist(sql, o.host, { venueId: o.venueId, name: "Ana", phone: "nope", partySize: 2, quotedMinutes: 25 }))
        .toEqual({ ok: false, reason: "invalid_phone" });
      const a = await addToWaitlist(sql, o.host, { venueId: o.venueId, name: "Ana Perez", phone: "(954) 555-4400", partySize: 2, quotedMinutes: 25 });
      const b = await addToWaitlist(sql, o.host, { venueId: o.venueId, name: "", phone: "", partySize: 3, quotedMinutes: 40 });
      if (!a.ok || !b.ok) throw new Error("setup");
      const list = await waitingList(sql, o.host, o.venueId);
      expect(list.map((w) => [w.name, w.partySize, w.quotedMinutes])).toEqual([["Ana Perez", 2, 25], ["Walk-in", 3, 40]]);

      expect(await textTableReady(sql, o.host, a.id, { restaurant: "Santorini", sender })).toBe("ok");
      expect(sent.at(-1)).toEqual({ to: "+19545554400", body: "Santorini: your table for 2 is ready. Please come to the host stand." });
      const [m] = await sql<{ kind: string; status: string }[]>`
        select m.kind, m.status from guest_messages m join guests g on g.id = m.guest_id
        where g.org_id = ${o.orgId} and g.phone = '+19545554400'`;
      expect(m).toEqual({ kind: "transactional", status: "dry_run" });
      expect(await textTableReady(sql, o.host, b.id, { restaurant: "Santorini", sender })).toBe("no_phone");

      // L1 is taken by the first walk-in: no table yet, and they stay on the list.
      expect(await seatFromWaitlist(sql, o.host, a.id)).toEqual({ ok: false, reason: "no_table" });
      expect((await waitingList(sql, o.host, o.venueId)).length).toBe(2);
      await sql`update reservations set status = 'completed' where venue_id = ${o.venueId} and status = 'seated'`;
      await sql`update reservation_tables set live = false where org_id = ${o.orgId}`;
      expect(await seatFromWaitlist(sql, o.host, a.id)).toMatchObject({ ok: true, tableLabel: "L1" });
      expect(await seatFromWaitlist(sql, o.host, a.id)).toEqual({ ok: false, reason: "not_found" });

      expect(await removeFromWaitlist(sql, o.host, b.id)).toBe(true);
      expect(await removeFromWaitlist(sql, o.host, b.id)).toBe(false);
      expect(await waitingList(sql, o.host, o.venueId)).toEqual([]);
      const other = await seedOrg(NY, [["X", 1, 2]]);
      expect(await removeFromWaitlist(sql, other.host, a.id)).toBe(false);
    });

    it("shows today's online sign-ups and texts one on the host's tap", async () => {
      const today = localDate(new Date(), middayZone());
      const [w] = await sql<{ id: string }[]>`
        insert into waitlist_requests (org_id, venue_id, name, phone, date, party_size)
        values (${o.orgId}, ${o.venueId}, 'Nik', '+19545557700', ${today}, 2) returning id`;
      expect((await todaysRequests(sql, o.host, o.venueId, today)).map((r) => r.name)).toEqual(["Nik"]);
      expect(await notifyRequest(sql, o.host, w.id, { restaurant: "Santorini", baseUrl: "https://pass.example", sender })).toBe("ok");
      expect(sent.at(-1)?.to).toBe("+19545557700");
      expect(sent.at(-1)?.body).toContain("a table for 2 just opened today");
      expect((await todaysRequests(sql, o.host, o.venueId, today))[0].status).toBe("notified");
    });
  });

  describe("walk-in with a known number", () => {
    it("keeps the stored name and notes a different one once", async () => {
      const o = await seedOrg(NY, [["N1", 1, 4], ["N2", 1, 4], ["N3", 1, 4], ["N4", 1, 4]]);
      await sql`insert into guests (org_id, phone, name) values (${o.orgId}, '+19545556600', 'Ana Perez')`;
      const walk = (name: string, time: string) =>
        seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 2, name, phone: "954-555-6600", now: at(time) });
      expect((await walk("Annie", "12:00")).ok).toBe(true);
      expect((await walk("annie", "12:01")).ok).toBe(true);
      expect((await walk("", "12:02")).ok).toBe(true);
      const [g] = await sql<{ name: string; notes: string | null }[]>`
        select name, notes from guests where org_id = ${o.orgId} and phone = '+19545556600'`;
      expect(g).toEqual({ name: "Ana Perez", notes: "Also booked as Annie" });
      // Someone only known as "Walk-in" takes the real name.
      await sql`insert into guests (org_id, phone, name) values (${o.orgId}, '+19545556601', 'Walk-in')`;
      expect((await seatWalkIn(sql, o.host, { venueId: o.venueId, partySize: 2, name: "Nik", phone: "954-555-6601", now: at("12:03") })).ok).toBe(true);
      const [h] = await sql<{ name: string; notes: string | null }[]>`
        select name, notes from guests where org_id = ${o.orgId} and phone = '+19545556601'`;
      expect(h).toEqual({ name: "Nik", notes: null });
    });
  });

  describe("kitchen cancel", () => {
    it("needs a reason, which goes in the log", async () => {
      const o = await seedOrg(NY, [["K1", 1, 2]]);
      const [order] = await sql<{ id: string }[]>`
        insert into orders (org_id, venue_id, number, kind, name, phone, ready_at, items, subtotal_cents, total_cents, manage_token)
        values (${o.orgId}, ${o.venueId}, 4821, 'pickup', 'Ana', 'none', now(), '[]'::jsonb, 1000, 1000, ${randomUUID()}) returning id`;
      const opts = { restaurant: "Santorini", sender: async () => ({ status: "dry_run" as const }) };
      expect(await cancelOrder(sql, o.host, order.id, "  ", opts)).toBe("reason_required");
      const [still] = await sql<{ status: string }[]>`select status from orders where id = ${order.id}`;
      expect(still.status).toBe("placed");
      expect(await cancelOrder(sql, o.host, order.id, "Out of an ingredient", opts)).toBe("ok");
      const [log] = await sql<{ detail: { reason: string } }[]>`
        select detail from change_log where entity_id = ${order.id} and action = 'order.cancelled'`;
      expect(log.detail.reason).toBe("Out of an ingredient");
    });
  });
});
