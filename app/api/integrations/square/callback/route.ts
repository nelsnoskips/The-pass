import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectSquare } from "@/lib/integrations/square";
import { readState } from "@/lib/integrations/secrets";
import { tenantFor } from "@/lib/platform/session";
import { can } from "@/lib/platform/tenant";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Square sends the owner back here; the state names the restaurant. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const state = readState(u.searchParams.get("state") ?? "");
  if (!state || state.provider !== "square") return NextResponse.redirect(siteLink(req, "/r"));
  const back = (q: string) => NextResponse.redirect(siteLink(req, `/r/${state.org}/settings?${q}`));
  if (u.searchParams.get("error")) return back(`err=${encodeURIComponent("Square access wasn't granted.")}`);
  const tenant = await tenantFor(state.org);
  const sql = db();
  if (!tenant || !sql || !can(tenant, "manage_venue")) return NextResponse.redirect(siteLink(req, "/login"));
  try {
    const label = await connectSquare(sql, tenant.orgId, u.searchParams.get("code") ?? "", tenant.actor);
    return back(`ok=${encodeURIComponent(`Connected to ${label} on Square. Checks will start matching to guests.`)}`);
  } catch (err) {
    return back(`err=${encodeURIComponent(err instanceof Error ? err.message : "Couldn't connect to Square.")}`);
  }
}
