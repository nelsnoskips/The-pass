import { NextResponse } from "next/server";
import { googleAuthorizeUrl, googleConfigured } from "@/lib/integrations/google";
import { integrationsKeyConfigured, signState } from "@/lib/integrations/secrets";
import { tenantFor } from "@/lib/platform/session";
import { can } from "@/lib/platform/tenant";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Send an owner or manager to Google to grant access to their profile. */
export async function GET(req: Request) {
  const org = new URL(req.url).searchParams.get("org") ?? "";
  const tenant = await tenantFor(org);
  const back = (q: string) => NextResponse.redirect(siteLink(req, `/r/${org}/settings?${q}`));
  if (!tenant || !can(tenant, "manage_venue")) return NextResponse.redirect(siteLink(req, "/login"));
  if (!googleConfigured() || !integrationsKeyConfigured()) {
    return back(`err=${encodeURIComponent("Google sign-in isn't set up on The Pass yet. Use Connect and the team will do it with you.")}`);
  }
  const redirectUri = siteLink(req, "/api/integrations/google/callback").toString();
  return NextResponse.redirect(googleAuthorizeUrl(redirectUri, signState({ org, provider: "google_business" })));
}
