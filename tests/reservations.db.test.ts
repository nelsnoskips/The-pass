import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import {
  availableSlots,
  book,
  cancelByToken,
  dayBook,
  normalizePhone,
  seatWalkIn,
  setStatus,
} from "@/lib/reservations/repo";
import { can, Forbidden, resolveTenant, type Tenant } from "@/lib/platform/tenant";
import { zonedToUtc } from "@/lib/reservations/time";

/**
 * Runs against a real Postgres when TEST_DATABASE_URL is set (with
 * db/schema.sql applied); skipped otherwise, so `npm test` stays
 * database-free by default. These are the guarantees that only the
 * database can give: no double-booking under a race, and no reading or
 * writing across restaurants.
 */
const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

const TZ = "America/New_York";
const FRI = "2026-11-13";
const NOW = zonedToUtc("2026-11-10", "12:00", TZ);

d("reservations against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 10, onnotice: () => {} });
  const ids = { orgA: "", orgB: "", venueA: "", venueB: "" };
  let staffA: Tenant, staffB: Tenant, hostA: Tenant, viewerA: Tenant;

  async function seedOrg(label: string) {
    const [org] = await sql<{ id: string }[]>`
      insert into orgs (name, slug) values (${label}, ${`${label}-${randomUUID().slice(0, 8)}`}) returning id`;
    const [venue] = await sql<{ id: string }[]>`
      insert into venues (org_id, name, slug, timezone) values (${org.id}, ${label}, 'main', ${TZ}) returning id`;
    await sql`insert into dining_tables (org_id, venue_id, label, min_covers, max_covers) values
      (${org.id}, ${venue.id}, '2A', 1, 2), (${org.id}, ${venue.id}, '2B', 1, 2),
      (${org.id}, ${venue.id}, '2C', 1, 2), (${org.id}, ${venue.id}, '4A', 3, 4)`;
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating, slot_minutes)
      values (${org.id}, ${venue.id}, 'Dinner', '{2,3,4,5,6}', '17:00', '21:00', 30)`;
    return { org: org.id, venue: venue.id };
  }

  const guest = (n: number) => ({ name: `Guest ${n}`, phone: `(954) 555-01${String(n).padStart(2, "0")}` });
  const bookAt = (time: string, n: number, over: Partial<Parameters<typeof book>[1]> = {}) =>
    book(sql, {
      orgId: ids.orgA, venueId: ids.venueA, date: FRI, time, partySize: 2,
      guest: guest(n), source: "website", actor: "guest", channel: "online", now: NOW, ...over,
    });

  beforeAll(async () => {
    const a = await seedOrg("alpha");
    const b = await seedOrg("beta");
    Object.assign(ids, { orgA: a.org, venueA: a.venue, orgB: b.org, venueB: b.venue });
    staffA = { orgId: a.org, actor: "staff@studio", role: "staff", venueIds: null };
    staffB = { orgId: b.org, actor: "staff@studio", role: "staff", venueIds: null };
    hostA = { orgId: a.org, actor: "host@alpha", role: "host", venueIds: [a.venue] };
    viewerA = { orgId: a.org, actor: "viewer@alpha", role: "viewer", venueIds: null };
  });

  afterAll(async () => {
    await sql`delete from orgs where id in (${ids.orgA}, ${ids.orgB})`;
    await sql.end();
  });

  it("books the best-fit table and shows it on the host's day book", async () => {
    const r = await bookAt("17:00", 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reservation.tableLabels).toEqual(["2A"]);
    const day = await dayBook(sql, hostA, ids.venueA, FRI);
    expect(day.map((x) => x.id)).toContain(r.reservation.id);
  });

  it("never double-books under a race: 3 fours, 1 four-top, same time", async () => {
    const results = await Promise.all([1, 2, 3].map((n) => bookAt("19:00", 10 + n, { partySize: 4 })));
    const ok = results.filter((r) => r.ok);
    expect(ok).toHaveLength(1);
    expect(ok[0].ok && ok[0].reservation.tableLabels).toEqual(["4A"]);
    expect(results.filter((r) => !r.ok && r.reason === "unavailable")).toHaveLength(2);
  });

  it("the database itself refuses overlapping holds on one table", async () => {
    const [t] = await sql<{ id: string }[]>`select id from dining_tables where venue_id = ${ids.venueA} and label = '2A'`;
    const [r] = await sql<{ id: string }[]>`select reservation_id as id from reservation_tables where table_id = ${t.id} and live limit 1`;
    const at = zonedToUtc(FRI, "17:30", TZ);
    const fake = randomUUID();
    await expect(sql.begin(async (tx) => {
      const [g] = await tx<{ id: string }[]>`select guest_id as id from reservations where id = ${r.id}`;
      await tx`insert into reservations (id, org_id, venue_id, guest_id, party_size, starts_at, ends_at, manage_token)
               values (${fake}, ${ids.orgA}, ${ids.venueA}, ${g.id}, 2, ${at}, ${new Date(at.getTime() + 3_600_000)}, ${fake})`;
      await tx`insert into reservation_tables (reservation_id, table_id, org_id, during)
               values (${fake}, ${t.id}, ${ids.orgA}, tstzrange(${at}, ${new Date(at.getTime() + 3_600_000)}, '[)'))`;
    })).rejects.toMatchObject({ code: "23P01" });
  });

  it("keeps restaurants apart", async () => {
    const r = await bookAt("20:00", 21);
    if (!r.ok) throw new Error("setup");
    // B's staff can't see or touch A's reservation.
    expect(await setStatus(sql, staffB, r.reservation.id, "cancelled")).toBe("not_found");
    expect(await dayBook(sql, staffB, ids.venueA, FRI)).toEqual([]);
    // Nor book into A's venue under B's org.
    const cross = await book(sql, {
      orgId: ids.orgB, venueId: ids.venueA, date: FRI, time: "20:30", partySize: 2,
      guest: guest(22), source: "website", actor: "guest", channel: "online", now: NOW,
    });
    expect(cross).toEqual({ ok: false, reason: "venue_not_found" });
    // A's own staff still can.
    expect(await setStatus(sql, staffA, r.reservation.id, "confirmed")).toBe("ok");
  });

  it("enforces roles: hosts seat, viewers can't", async () => {
    const r = await bookAt("20:30", 31);
    if (!r.ok) throw new Error("setup");
    await expect(setStatus(sql, viewerA, r.reservation.id, "seated")).rejects.toBeInstanceOf(Forbidden);
    expect(await setStatus(sql, hostA, r.reservation.id, "seated", { now: zonedToUtc(FRI, "20:35", TZ) })).toBe("ok");
    // Sat down: can never become a no-show.
    expect(await setStatus(sql, hostA, r.reservation.id, "no_show", { now: zonedToUtc(FRI, "20:50", TZ) })).toBe("invalid");
    expect(can(hostA, "approve_spend")).toBe(false);
    expect(can(hostA, "book", ids.venueB)).toBe(false);
  });

  it("frees the table when a guest cancels from their link", async () => {
    const r = await bookAt("21:00", 41, { partySize: 4 });
    // 4A is the only four-top; the 19:00 four holds it until 20:45.
    if (!r.ok) throw new Error("setup");
    const before = await availableSlots(sql, { orgId: ids.orgA, venueId: ids.venueA, date: FRI, partySize: 4, channel: "online", now: NOW });
    expect(before.map((s) => s.time)).not.toContain("21:00");
    expect(await cancelByToken(sql, r.reservation.manageToken)).toBe(true);
    expect(await cancelByToken(sql, r.reservation.manageToken)).toBe(false);
    const after = await availableSlots(sql, { orgId: ids.orgA, venueId: ids.venueA, date: FRI, partySize: 4, channel: "online", now: NOW });
    expect(after.map((s) => s.time)).toContain("21:00");
  });

  it("recognises a returning guest by phone, and never overwrites consent", async () => {
    await bookAt("17:30", 51, { guest: { name: "Ana", phone: "954-555-9999", smsMarketingConsent: true } });
    // A different day: one online booking per phone per day.
    await bookAt("18:00", 52, { date: "2026-11-12", guest: { name: "Ana P.", phone: "+1 (954) 555 9999", smsMarketingConsent: false } });
    const rows = await sql<{ name: string; sms_consent_at: Date | null }[]>`
      select name, sms_consent_at from guests where org_id = ${ids.orgA} and phone = '+19545559999'`;
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Ana P.");
    expect(rows[0].sms_consent_at).not.toBeNull();
  });

  it("counts visits and no-shows on the guest, and logs every change", async () => {
    const r = await bookAt("18:30", 61);
    if (!r.ok) throw new Error("setup");
    expect(await setStatus(sql, hostA, r.reservation.id, "seated", { now: zonedToUtc(FRI, "18:35", TZ) })).toBe("ok");
    await setStatus(sql, hostA, r.reservation.id, "completed");
    const [g] = await sql<{ visit_count: number }[]>`select visit_count from guests where id = ${r.reservation.guestId}`;
    expect(g.visit_count).toBe(1);
    const log = await sql<{ actor: string; action: string }[]>`
      select actor, action from change_log where entity_id = ${r.reservation.id} order by id`;
    expect(log.map((l) => l.action)).toEqual(["reservation.created", "reservation.seated", "reservation.completed"]);
    expect(log[1].actor).toBe("host@alpha");
  });

  it("one live online booking per phone per day; staff aren't limited", async () => {
    const SAT = "2026-11-14";
    const at = (time: string, phone: string, channel: "online" | "staff" = "online") =>
      book(sql, {
        orgId: ids.orgA, venueId: ids.venueA, date: SAT, time, partySize: 2,
        guest: { name: "Repeat", phone }, source: "website", actor: "guest", channel, now: NOW,
      });
    expect((await at("17:00", "954-555-7777")).ok).toBe(true);
    expect(await at("19:00", "+1 954 555 7777")).toEqual({ ok: false, reason: "already_booked" });
    expect((await at("19:30", "954-555-7777", "staff")).ok).toBe(true);
  });

  it("caps online booking attempts per phone per hour", async () => {
    const results = [];
    for (const date of ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]) {
      results.push(await book(sql, {
        orgId: ids.orgA, venueId: ids.venueA, date, time: "17:00", partySize: 2,
        guest: { name: "Hoarder", phone: "954-555-8888" }, source: "website", actor: "guest", channel: "online", now: NOW,
      }));
    }
    expect(results.slice(0, 4).every((r) => r.ok)).toBe(true);
    expect(results[4]).toEqual({ ok: false, reason: "too_many" });
  });

  it("seats walk-ins with no phone, who can never be texted", async () => {
    const r = await seatWalkIn(sql, hostA, { venueId: ids.venueA, partySize: 2, name: "", phone: "", now: zonedToUtc(FRI, "22:30", TZ) });
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    const [g] = await sql<{ name: string; phone: string; status: string }[]>`
      select g.name, g.phone, r.status from reservations r join guests g on g.id = r.guest_id where r.id = ${r.reservationId}`;
    expect(g.name).toBe("Walk-in");
    expect(g.phone.startsWith("+")).toBe(false);
    expect(g.status).toBe("seated");
    // Viewers can't seat anyone.
    await expect(seatWalkIn(sql, viewerA, { venueId: ids.venueA, partySize: 2, name: "x", phone: "" })).rejects.toBeInstanceOf(Forbidden);
  });

  it("resolves tenants from email, and nobody else", async () => {
    const [{ slug }] = await sql<{ slug: string }[]>`select slug from orgs where id = ${ids.orgA}`;
    await sql`insert into org_members (org_id, email, role) values (${ids.orgA}, 'Owner@Alpha.com', 'owner')`;
    const isStaff = (e: string) => e === "nelson@studio";
    expect((await resolveTenant(sql, "owner@alpha.com", slug, isStaff))?.role).toBe("owner");
    expect((await resolveTenant(sql, "nelson@studio", slug, isStaff))?.role).toBe("staff");
    expect(await resolveTenant(sql, "stranger@x.com", slug, isStaff)).toBeNull();
    expect(await resolveTenant(sql, "owner@alpha.com", "no-such-org", isStaff)).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("normalizes US numbers to E.164 and rejects junk", () => {
    expect(normalizePhone("(954) 555-0101")).toBe("+19545550101");
    expect(normalizePhone("1-954-555-0101")).toBe("+19545550101");
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhone("555-0101")).toBeNull();
    expect(normalizePhone("call me")).toBeNull();
  });
});
