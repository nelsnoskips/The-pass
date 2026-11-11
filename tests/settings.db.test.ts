import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import {
  addMember, listMembers, listOrgIntegrations, removeMember, savePeriod, saveTable, saveVenueRules, setIntegration,
} from "@/lib/platform/settings";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";
import { manualPayments, markDepositPaid } from "@/lib/payments";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("restaurant settings", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", venueId = "";
  let owner: Tenant, manager: Tenant, host: Tenant, staff: Tenant, stranger: Tenant;

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Set', ${`set-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug) values (${orgId}, 'Main', 'main') returning id`;
    venueId = v.id;
    await sql`insert into org_members (org_id, email, role) values (${orgId}, 'owner@set', 'owner')`;
    owner = { orgId, actor: "owner@set", role: "owner", venueIds: null };
    manager = { orgId, actor: "mgr@set", role: "manager", venueIds: null };
    host = { orgId, actor: "host@set", role: "host", venueIds: null };
    staff = { orgId, actor: "studio@pass", role: "staff", venueIds: null };
    stranger = { orgId: randomUUID(), actor: "x@y", role: "owner", venueIds: null };
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  it("owners manage the team; the last owner can't be removed", async () => {
    expect(await addMember(sql, owner, "Host@Set.co", "host")).toBeNull();
    expect(await addMember(sql, owner, "not-an-email", "host")).toBe("That email doesn't look right.");
    expect(await addMember(sql, owner, "a@b.co", "admin")).toBe("Pick a role.");
    await expect(addMember(sql, manager, "x@set.co", "host")).rejects.toBeInstanceOf(Forbidden);
    const members = await listMembers(sql, owner);
    expect(members.map((m) => m.email).sort()).toEqual(["host@set.co", "owner@set"]);
    const theOwner = members.find((m) => m.role === "owner")!;
    expect(await removeMember(sql, owner, theOwner.id)).toBe("A restaurant needs at least one owner.");
    expect(await removeMember(sql, owner, members.find((m) => m.role === "host")!.id)).toBeNull();
  });

  it("validates tables and refuses duplicates", async () => {
    const t = { label: "T1", area: "", minCovers: 1, maxCovers: 2, online: true, active: true };
    expect(await saveTable(sql, manager, venueId, t)).toBeNull();
    expect(await saveTable(sql, manager, venueId, t)).toBe("There's already a table called T1.");
    expect(await saveTable(sql, manager, venueId, { ...t, label: "T2", minCovers: 4, maxCovers: 2 })).toMatch(/max at least min/);
    await expect(saveTable(sql, host, venueId, { ...t, label: "T3" })).rejects.toBeInstanceOf(Forbidden);
    expect(await saveTable(sql, stranger, venueId, { ...t, label: "T4" })).toBe("Venue not found.");
  });

  it("validates service hours and deposits", async () => {
    const p = { name: "Dinner", daysOfWeek: [2, 3, 3, 9], firstSeating: "17:00", lastSeating: "21:00", slotMinutes: 15, maxCoversPerSlot: null, depositCentsPerCover: 1000 };
    expect(await savePeriod(sql, manager, venueId, p)).toBeNull();
    const [row] = await sql<{ days_of_week: number[] }[]>`select days_of_week from service_periods where venue_id = ${venueId}`;
    expect(row.days_of_week.map(Number)).toEqual([2, 3]);
    expect(await savePeriod(sql, manager, venueId, { ...p, lastSeating: "16:00" })).toMatch(/last after first/);
    expect(await savePeriod(sql, manager, venueId, { ...p, slotMinutes: 7 })).toMatch(/10, 15, 20, 30 or 60/);
    expect(await savePeriod(sql, manager, venueId, { ...p, daysOfWeek: [] })).toBe("Pick at least one day.");
  });

  it("validates booking rules", async () => {
    const r = { bookingHorizonDays: 60, minNoticeMinutes: 60, maxPartyOnline: 8, cancellationPolicy: "Cancel 24h ahead.", cancelCutoffHours: 24, phone: "", address: "", timezone: "America/New_York" };
    expect(await saveVenueRules(sql, manager, venueId, r)).toBeNull();
    expect(await saveVenueRules(sql, manager, venueId, { ...r, timezone: "Mars/Olympus" })).toBe("Unknown timezone.");
    expect(await saveVenueRules(sql, manager, venueId, { ...r, maxPartyOnline: 0 })).toMatch(/Largest online party/);
  });

  it("restaurants request connections; only the studio marks them connected", async () => {
    expect(await setIntegration(sql, manager, "google_business", "requested")).toBeNull();
    expect(await setIntegration(sql, owner, "google_business", "connected")).toBe("The Pass team completes this connection.");
    expect(await setIntegration(sql, staff, "google_business", "connected", "Santorini Las Olas")).toBeNull();
    expect(await setIntegration(sql, manager, "twilio", "requested")).toBe("Unknown connection.");
    const [i] = await listOrgIntegrations(sql, owner);
    expect(i).toMatchObject({ provider: "google_business", status: "connected", accountLabel: "Santorini Las Olas" });
    expect(await listOrgIntegrations(sql, stranger)).toEqual([]);
  });

  it("records a deposit and lets staff mark it paid, once", async () => {
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${orgId}, '+13055550000', 'Dep') returning id`;
    const [r] = await sql<{ id: string }[]>`
      insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, deposit_cents, deposit_status, manage_token)
      values (${orgId}, ${venueId}, ${g.id}, 2, now() + interval '2 days', now() + interval '2 days 90 minutes', 2000, 'pending', ${randomUUID()})
      returning id`;
    const pay = await manualPayments.createDeposit(sql, { orgId, reservationId: r.id, amountCents: 2000, returnUrl: "/", description: "x" });
    expect(pay.checkoutUrl).toBeNull();
    expect(await markDepositPaid(sql, orgId, r.id, "host@set")).toBe(true);
    expect(await markDepositPaid(sql, orgId, r.id, "host@set")).toBe(false);
    expect(await markDepositPaid(sql, stranger.orgId, r.id, "x")).toBe(false);
    const [row] = await sql<{ deposit_status: string }[]>`select deposit_status from reservations where id = ${r.id}`;
    expect(row.deposit_status).toBe("held");
  });
});
