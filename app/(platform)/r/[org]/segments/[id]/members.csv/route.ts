import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { getSegment, segmentMembers } from "@/lib/marketing/segments";
import { tenantFor } from "@/lib/platform/session";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

/** A segment's members as CSV, with consent, like the guest export. */

/** Guest-entered text can start with = or + and run as a formula in a spreadsheet. */
const safe = (v: string | null): string | null => (v && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const iso = (d: Date | null) => (d ? d.toISOString() : null);

export async function GET(_req: Request, { params }: { params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  const sql = db();
  const tenant = sql ? await tenantFor(org) : null;
  if (!sql || !tenant || !can(tenant, "manage_venue")) return new NextResponse("Not found", { status: 404 });
  const seg = await getSegment(sql, tenant, id);
  if (!seg) return new NextResponse("Not found", { status: 404 });

  const rows = await segmentMembers(sql, tenant, seg.rules, { page: 1, pageSize: 10_000 });
  const csv = toCsv(
    ["name", "phone", "email", "visits", "no_shows", "last_visit", "online_spend", "can_text", "can_email", "first_seen"],
    rows.map((r) => [
      safe(r.name), r.phone.startsWith("+") ? r.phone : null, safe(r.email), r.visit_count, r.no_show_count, iso(r.last_visit_at),
      r.online_cents ? (r.online_cents / 100).toFixed(2) : null, r.sms_ok ? "yes" : "no", r.email_ok ? "yes" : "no", iso(r.created_at),
    ]),
  );
  const name = seg.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "segment";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${org}-${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
