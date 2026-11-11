import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { importBookings, importGuests, parseCsv } from "@/lib/platform/importer";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

describe("parseCsv", () => {
  it("handles quotes, embedded commas and newlines, CRLF and a BOM", () => {
    const csv = '﻿Name,Notes\r\n"Perez, Ana","Window seat\nplease"\r\n"Say ""hi""",x\r\n\r\n';
    expect(parseCsv(csv)).toEqual([["Name", "Notes"], ["Perez, Ana", "Window seat\nplease"], ['Say "hi"', "x"]]);
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("importer against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", venueId = "";
  let manager: Tenant, host: Tenant;

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Imp', ${`imp-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug) values (${orgId}, 'Main', 'main') returning id`;
    venueId = v.id;
    await sql`insert into dining_tables (org_id, venue_id, label, max_covers) values (${orgId}, ${venueId}, 'A', 4)`;
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating, slot_minutes)
              values (${orgId}, ${venueId}, 'Dinner', '{0,1,2,3,4,5,6}', '17:00', '21:00', 30)`;
    await sql`insert into guests (org_id, phone, name, visit_count, sms_consent_at, sms_consent_source)
              values (${orgId}, '+13055551111', 'Existing', 9, now(), 'booking:website')`;
    manager = { orgId, actor: "mgr@imp", role: "manager", venueIds: null };
    host = { orgId, actor: "host@imp", role: "host", venueIds: null };
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  const guestsCsv = [
    "First Name,Last Name,Phone Number,Email,Total Visits,Last Visit,SMS Opt In",
    "Ana,Perez,(954) 555-2001,ana@example.com,4,2026-08-01,yes",
    "Ben,Cole,954-555-2002,,1,8/15/2026,",
    "No,Phone,,x@example.com,2,,yes",
    "Existing,Guest,305-555-1111,,2,2026-01-01,no",
  ].join("\n");

  it("dry run reports and writes nothing", async () => {
    const r = await importGuests(sql, manager, guestsCsv, { dryRun: true, source: "ot.csv" });
    expect(r).toMatchObject({ dryRun: true, rows: 4, created: 2, updated: 1, optedIn: 1 });
    expect(r.skipped).toEqual([{ line: 4, reason: "no usable phone number" }]);
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from guests where org_id = ${orgId}`;
    expect(n).toBe(1);
  });

  it("imports, merges without downgrading, and only opts in who the file says", async () => {
    await importGuests(sql, manager, guestsCsv, { dryRun: false, source: "ot.csv" });
    const rows = await sql<{ name: string; phone: string; visit_count: number; sms_consent_source: string | null }[]>`
      select name, phone, visit_count, sms_consent_source from guests where org_id = ${orgId} order by phone`;
    expect(rows).toEqual([
      { name: "Existing", phone: "+13055551111", visit_count: 9, sms_consent_source: "booking:website" },
      { name: "Ana Perez", phone: "+19545552001", visit_count: 4, sms_consent_source: "import:ot.csv" },
      { name: "Ben Cole", phone: "+19545552002", visit_count: 1, sms_consent_source: null },
    ]);
  });

  it("names missing columns instead of guessing", async () => {
    const r = await importGuests(sql, manager, "Who,When\nAna,today", { dryRun: true, source: "x" });
    expect(r.missingColumns).toEqual(["phone", "name"]);
  });

  it("places future bookings on real tables and lists what can't fit", async () => {
    const csv = ["Guest Name,Date,Time,Party Size,Phone", "Ana Perez,11/20/2026,7:00 PM,4,954-555-2001", "Ben Cole,2026-11-20,7:00 pm,4,", "Cy,2026-11-20,25:00,2,"].join("\n");
    const r = await importBookings(sql, manager, venueId, csv, { dryRun: false, source: "resy.csv" });
    expect(r.created).toBe(1);
    expect(r.skipped).toEqual([
      { line: 3, reason: "no free table at 19:00 on 2026-11-20 — seat it by hand" },
      { line: 4, reason: "date or time not recognised" },
    ]);
    const [b] = await sql<{ source: string }[]>`select source from reservations where org_id = ${orgId}`;
    expect(b.source).toBe("import");
  });

  it("hosts can't import guests", async () => {
    await expect(importGuests(sql, host, guestsCsv, { dryRun: true, source: "x" })).rejects.toBeInstanceOf(Forbidden);
  });
});
