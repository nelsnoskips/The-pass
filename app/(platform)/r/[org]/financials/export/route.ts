import { NextResponse } from "next/server";
import { toCsv, type CsvValue } from "@/lib/csv";
import { db } from "@/lib/db";
import { tenantFor } from "@/lib/platform/session";
import { can } from "@/lib/platform/tenant";
import { KIND_LABEL, parseTxKind, parseTxStatus, transactions, type Transaction } from "@/lib/reports/financials";
import { parseDays, periodsForOrg } from "@/lib/reports/period";

export const dynamic = "force-dynamic";

/**
 * The transactions list as a spreadsheet, with the same period and
 * filters as the page. Amounts are dollars with two decimals; the
 * guest's name is included, so it needs the same role as the guest export.
 * Gift card redemptions are listed with their amount as taken off the
 * card: they reduce what's owed on cards, they aren't money in or out.
 */

const safe = (v: string | null): string | null => (v && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const dollars = (c: number) => (c / 100).toFixed(2);

export async function GET(req: Request, { params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const sql = db();
  const tenant = sql ? await tenantFor(org) : null;
  if (!sql || !tenant || !can(tenant, "manage_venue")) return new NextResponse("Not found", { status: 404 });

  const u = new URL(req.url);
  const p = await periodsForOrg(sql, tenant.orgId, parseDays(u.searchParams.get("days")));
  const kind = parseTxKind(u.searchParams.get("kind"));
  const status = parseTxStatus(u.searchParams.get("status"));
  const all: Transaction[] = [];
  for (let page = 1; page <= 200; page++) {
    const t = await transactions(sql, tenant, { range: p.cur, tz: p.tz, kind, status, page, pageSize: 500 });
    all.push(...t.rows);
    if (page >= t.pages) break;
  }

  const headers = ["created_at", "type", "status", "amount", "for", "who", "provider", "provider_ref", "updated_at"];
  const rows: CsvValue[][] = all.map((r) => [
    r.createdAt.toISOString(), KIND_LABEL[r.kind], r.status, dollars(r.amountCents),
    safe(r.ref), safe(r.who), r.provider, r.providerRef, r.updatedAt.toISOString(),
  ]);
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${org}-transactions-${p.cur.since}-to-${p.cur.until}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
