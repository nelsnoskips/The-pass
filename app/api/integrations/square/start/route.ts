import { NextResponse } from "next/server";
import { squareAuthorizeUrl, squareConfigured } from "@/lib/integrations/square";
import { integrationsKeyConfigured, signState } from "@/lib/integrations/secrets";
import { tenantFor } from "@/lib/platform/session";
import { can } from "@/lib/platform/tenant";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Send an owner or manager to Square to connect their point of sale. */
export async function GET(req: Request) {
  const org = new URL(req.url).searchParams.get("org") ?? "";
  const tenant = await tenantFor(org);
  const back = (q: string) => NextResponse.redirect(siteLink(req, `/r/${org}/settings?${q}`));
  if (!tenant || !can(tenant, "manage_venue")) return NextResponse.redirect(siteLink(req, "/login"));
  if (!squareConfigured() || !integrationsKeyConfigured()) {
    return back(`err=${encodeURIComponent("Square sign-in isn't set up on The Pass yet. Use Connect and the team will do it with you.")}`);
  }
  return NextResponse.redirect(squareAuthorizeUrl(signState({ org, provider: "square" })));
}
