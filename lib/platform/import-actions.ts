"use server";

import { db } from "../db";
import { requireTenant } from "./context";
import { importBookings, importGuests, type ImportReport } from "./importer";
import { Forbidden } from "./tenant";

const MAX_BYTES = 900_000;

export async function runImport(
  org: string, kind: "guests" | "bookings", csv: string, fileName: string, dryRun: boolean,
): Promise<{ error: string | null; report?: ImportReport }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant, venues } = await requireTenant(org);
  if (csv.length > MAX_BYTES) return { error: "That file is over 900 KB. Split it, or send it to The Pass team to load." };
  const source = fileName.replace(/[^\w.\- ]+/g, "").slice(0, 80) || "upload";
  try {
    const report = kind === "guests"
      ? await importGuests(sql, tenant, csv, { dryRun, source })
      : await importBookings(sql, tenant, venues[0]?.id ?? "", csv, { dryRun, source });
    return { error: null, report };
  } catch (err) {
    if (err instanceof Forbidden) return { error: "Your role can't import." };
    throw err;
  }
}
