import { NextResponse } from "next/server";
import { toCsv, type CsvValue } from "@/lib/csv";
import { db } from "@/lib/db";
import { tenantFor } from "@/lib/platform/session";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

/**
 * One-click export of the restaurant's own data: guests (with consent
 * history) and bookings. The answer to "switching away is a slog" — and
 * the proof that the guest list is theirs.
 */

/** Guest-entered text can start with = or + and run as a formula in a spreadsheet. */
const safe = (v: string | null): string | null => (v && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const iso = (d: Date | null) => (d ? d.toISOString() : null);

export async function GET(_req: Request, { params }: { params: Promise<{ org: string; kind: string }> }) {
  const { org, kind } = await params;
  const sql = db();
  const tenant = sql ? await tenantFor(org) : null;
  if (!sql || !tenant || !can(tenant, "manage_venue")) return new NextResponse("Not found", { status: 404 });

  let headers: string[];
  let rows: CsvValue[][];
  if (kind === "guests.csv") {
    const g = await sql<{ name: string; phone: string; email: string | null; visit_count: number; no_show_count: number; last_visit_at: Date | null; sms_consent_at: Date | null; sms_consent_source: string | null; sms_opted_out_at: Date | null; notes: string | null; created_at: Date }[]>`
      select name, phone, email, visit_count, no_show_count, last_visit_at, sms_consent_at, sms_consent_source, sms_opted_out_at, notes, created_at
      from guests where org_id = ${tenant.orgId} order by created_at`;
    headers = ["name", "phone", "email", "visits", "no_shows", "last_visit", "sms_consent_at", "sms_consent_source", "sms_opted_out_at", "notes", "first_seen"];
    rows = g.map((r) => [safe(r.name), r.phone.startsWith("+") ? r.phone : null, safe(r.email), r.visit_count, r.no_show_count, iso(r.last_visit_at), iso(r.sms_consent_at), r.sms_consent_source, iso(r.sms_opted_out_at), safe(r.notes), iso(r.created_at)]);
  } else if (kind === "bookings.csv") {
    const b = await sql<{ venue: string; name: string; phone: string; party_size: number; starts_at: Date; status: string; source: string; notes: string | null; tables: string | null; created_at: Date }[]>`
      select v.name as venue, g.name, g.phone, r.party_size, r.starts_at, r.status, r.source, r.notes,
             string_agg(t.label, ' ' order by t.label) as tables, r.created_at
      from reservations r join guests g on g.id = r.guest_id join venues v on v.id = r.venue_id
      left join reservation_tables rt on rt.reservation_id = r.id
      left join dining_tables t on t.id = rt.table_id
      where r.org_id = ${tenant.orgId}
      group by r.id, v.name, g.name, g.phone order by r.starts_at`;
    headers = ["venue", "guest", "phone", "party", "starts_at", "status", "source", "notes", "tables", "booked_at"];
    rows = b.map((r) => [r.venue, safe(r.name), r.phone.startsWith("+") ? r.phone : null, r.party_size, iso(r.starts_at), r.status, r.source, safe(r.notes), r.tables, iso(r.created_at)]);
  } else {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${org}-${kind.replace(".csv", "")}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
