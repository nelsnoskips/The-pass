import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectGoogle } from "@/lib/integrations/google";
import { readState } from "@/lib/integrations/secrets";
import { tenantFor } from "@/lib/platform/session";
import { can } from "@/lib/platform/tenant";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Google sends the owner back here. The state proves which restaurant
 * started it; the session proves the same person is finishing it.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const state = readState(u.searchParams.get("state") ?? "");
  if (!state || state.provider !== "google_business") return NextResponse.redirect(siteLink(req, "/r"));
  const back = (q: string) => NextResponse.redirect(siteLink(req, `/r/${state.org}/settings?${q}`));
  if (u.searchParams.get("error")) return back(`err=${encodeURIComponent("Google access wasn't granted.")}`);
  const tenant = await tenantFor(state.org);
  const sql = db();
  if (!tenant || !sql || !can(tenant, "manage_venue")) return NextResponse.redirect(siteLink(req, "/login"));
  try {
    const title = await connectGoogle(sql, tenant.orgId, u.searchParams.get("code") ?? "",
      siteLink(req, "/api/integrations/google/callback").toString(), tenant.actor);
    return back(`ok=${encodeURIComponent(`Connected to ${title} on Google.`)}`);
  } catch (err) {
    return back(`err=${encodeURIComponent(err instanceof Error ? err.message : "Couldn't connect to Google.")}`);
  }
}
