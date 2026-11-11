import type { Sql } from "postgres";
import { book, log, normalizePhone } from "../reservations/repo";
import { assertCan, type Tenant } from "./tenant";

/**
 * Bring a restaurant's history with them: guests and future bookings from
 * whatever their old system exports. Column names vary by system, so
 * headers are matched loosely. Every run can be a dry run first; nothing
 * is assumed that the file doesn't say — in particular, nobody is opted
 * in to texts unless the file has an explicit yes for them.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const ALIASES: Record<string, string[]> = {
  name: ["name", "guest", "guest name", "full name", "customer"],
  first: ["first name", "firstname", "first"],
  last: ["last name", "lastname", "last", "surname"],
  phone: ["phone", "phone number", "mobile", "mobile phone", "cell", "telephone"],
  email: ["email", "email address", "e-mail"],
  visits: ["visits", "visit count", "total visits", "completed visits"],
  lastVisit: ["last visit", "last visit date", "last_visit", "last seen"],
  smsOptIn: ["sms opt in", "sms_opt_in", "text opt in", "marketing opt in", "sms consent", "opted in"],
  notes: ["notes", "guest notes", "special requests", "request", "notes / requests"],
  date: ["date", "reservation date", "visit date"],
  time: ["time", "reservation time"],
  party: ["party", "party size", "covers", "guests", "size"],
};

function columns(header: string[]): Record<string, number> {
  const norm = header.map((h) => h.trim().toLowerCase().replace(/[_]+/g, " "));
  const out: Record<string, number> = {};
  for (const [key, names] of Object.entries(ALIASES)) {
    const i = norm.findIndex((h) => names.includes(h));
    if (i >= 0) out[key] = i;
  }
  return out;
}

export interface ImportReport {
  dryRun: boolean;
  rows: number;
  created: number;
  updated: number;
  optedIn: number;
  skipped: { line: number; reason: string }[];
  missingColumns: string[];
}

const YES = new Set(["yes", "y", "true", "1", "opted in", "subscribed"]);

function toDate(v: string): string | null {
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(t);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

function toTime(v: string): string | null {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(v.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return h < 24 ? `${String(h).padStart(2, "0")}:${m[2]}` : null;
}

export async function importGuests(sql: Sql, t: Tenant, csv: string, opts: { dryRun: boolean; source: string }): Promise<ImportReport> {
  assertCan(t, "manage_venue");
  const [header, ...body] = parseCsv(csv).slice(0, 20001);
  const col = columns(header ?? []);
  const report: ImportReport = { dryRun: opts.dryRun, rows: body.length, created: 0, updated: 0, optedIn: 0, skipped: [], missingColumns: [] };
  if (col.phone === undefined) report.missingColumns.push("phone");
  if (col.name === undefined && col.first === undefined) report.missingColumns.push("name");
  if (report.missingColumns.length) return report;

  const cell = (r: string[], k: string) => (col[k] === undefined ? "" : (r[col[k]] ?? "").trim());
  for (let i = 0; i < body.length; i++) {
    const r = body[i];
    const line = i + 2;
    const phone = normalizePhone(cell(r, "phone"));
    const name = (cell(r, "name") || `${cell(r, "first")} ${cell(r, "last")}`).trim().slice(0, 120);
    if (!phone) { report.skipped.push({ line, reason: "no usable phone number" }); continue; }
    if (!name) { report.skipped.push({ line, reason: "no name" }); continue; }
    const visits = Math.max(0, Math.min(10000, Number.parseInt(cell(r, "visits"), 10) || 0));
    const last = toDate(cell(r, "lastVisit"));
    const optIn = col.smsOptIn !== undefined && YES.has(cell(r, "smsOptIn").toLowerCase());
    if (optIn) report.optedIn++;
    if (opts.dryRun) {
      const [exists] = await sql`select 1 from guests where org_id = ${t.orgId} and phone = ${phone}`;
      if (exists) report.updated++; else report.created++;
      continue;
    }
    const [res] = await sql<{ inserted: boolean }[]>`
      insert into guests (org_id, phone, name, email, notes, visit_count, last_visit_at, sms_consent_at, sms_consent_source)
      values (${t.orgId}, ${phone}, ${name}, ${cell(r, "email") || null}, ${cell(r, "notes").slice(0, 1000) || null},
              ${visits}, ${last}, ${optIn ? new Date() : null}, ${optIn ? `import:${opts.source}` : null})
      on conflict (org_id, phone) do update set
        email = coalesce(guests.email, excluded.email),
        notes = coalesce(guests.notes, excluded.notes),
        visit_count = greatest(guests.visit_count, excluded.visit_count),
        last_visit_at = greatest(guests.last_visit_at, excluded.last_visit_at),
        sms_consent_at = coalesce(guests.sms_consent_at, excluded.sms_consent_at),
        sms_consent_source = coalesce(guests.sms_consent_source, excluded.sms_consent_source)
      returning (xmax = 0) as inserted`;
    if (res.inserted) report.created++; else report.updated++;
  }
  if (!opts.dryRun) await log(sql, t.orgId, t.actor, "import.guests", "import", opts.source, { ...report, skipped: report.skipped.length });
  return report;
}

/** Future bookings from the old system, each placed on a real table. */
export async function importBookings(sql: Sql, t: Tenant, venueId: string, csv: string, opts: { dryRun: boolean; source: string }): Promise<ImportReport> {
  assertCan(t, "book", venueId);
  const [header, ...body] = parseCsv(csv).slice(0, 5001);
  const col = columns(header ?? []);
  const report: ImportReport = { dryRun: opts.dryRun, rows: body.length, created: 0, updated: 0, optedIn: 0, skipped: [], missingColumns: [] };
  for (const k of ["date", "time", "party"]) if (col[k] === undefined) report.missingColumns.push(k);
  if (col.name === undefined && col.first === undefined) report.missingColumns.push("name");
  if (report.missingColumns.length) return report;

  const cell = (r: string[], k: string) => (col[k] === undefined ? "" : (r[col[k]] ?? "").trim());
  for (let i = 0; i < body.length; i++) {
    const r = body[i];
    const line = i + 2;
    const date = toDate(cell(r, "date"));
    const time = toTime(cell(r, "time"));
    const party = Number.parseInt(cell(r, "party"), 10);
    const name = (cell(r, "name") || `${cell(r, "first")} ${cell(r, "last")}`).trim();
    if (!date || !time) { report.skipped.push({ line, reason: "date or time not recognised" }); continue; }
    if (!Number.isInteger(party) || party < 1) { report.skipped.push({ line, reason: "no party size" }); continue; }
    if (opts.dryRun) { report.created++; continue; }
    const res = await book(sql, {
      orgId: t.orgId, venueId, date, time, partySize: party,
      guest: { name, phone: cell(r, "phone") }, notes: cell(r, "notes").slice(0, 500) || null,
      source: "import", actor: t.actor, channel: "staff",
    });
    if (res.ok) report.created++;
    else report.skipped.push({ line, reason: res.reason === "unavailable" ? `no free table at ${time} on ${date} — seat it by hand` : res.reason.replace(/_/g, " ") });
  }
  if (!opts.dryRun) await log(sql, t.orgId, t.actor, "import.bookings", "import", opts.source, { ...report, skipped: report.skipped.length });
  return report;
}
