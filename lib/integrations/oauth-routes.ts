import { NextResponse } from "next/server";
import { db } from "../db";
import { tenantFor } from "../platform/session";
import { can } from "../platform/tenant";
import { siteLink } from "../site";
import { integrationsKeyConfigured, readState, signState } from "./secrets";

/**
 * The two halves every "Sign in with …" connection shares. Each provider
 * supplies how to build its authorize URL and how to finish; the state
 * check, permission check and redirects live here once.
 */

export function oauthStart(opts: {
  provider: string; label: string; configured: () => boolean; callbackPath: string;
  authorizeUrl: (redirectUri: string, state: string) => string;
}) {
  return async function GET(req: Request) {
    const org = new URL(req.url).searchParams.get("org") ?? "";
    const tenant = await tenantFor(org);
    const back = (q: string) => NextResponse.redirect(siteLink(req, `/r/${org}/settings?${q}`));
    if (!tenant || !can(tenant, "manage_venue")) return NextResponse.redirect(siteLink(req, "/login"));
    if (!opts.configured() || !integrationsKeyConfigured()) {
      return back(`err=${encodeURIComponent(`${opts.label} sign-in isn't set up on The Pass yet. Use Connect and the team will do it with you.`)}`);
    }
    const redirectUri = siteLink(req, opts.callbackPath).toString();
    return NextResponse.redirect(opts.authorizeUrl(redirectUri, signState({ org, provider: opts.provider })));
  };
}

export function oauthCallback(opts: {
  provider: string; label: string; callbackPath: string;
  complete: (orgId: string, code: string, redirectUri: string, actor: string) => Promise<string>;
  after?: (orgId: string) => Promise<unknown>;
}) {
  return async function GET(req: Request) {
    const u = new URL(req.url);
    const state = readState(u.searchParams.get("state") ?? "");
    if (!state || state.provider !== opts.provider) return NextResponse.redirect(siteLink(req, "/r"));
    const back = (q: string) => NextResponse.redirect(siteLink(req, `/r/${state.org}/settings?${q}`));
    if (u.searchParams.get("error")) return back(`err=${encodeURIComponent(`${opts.label} access wasn't granted.`)}`);
    const tenant = await tenantFor(state.org);
    if (!tenant || !db() || !can(tenant, "manage_venue")) return NextResponse.redirect(siteLink(req, "/login"));
    try {
      const label = await opts.complete(tenant.orgId, u.searchParams.get("code") ?? "", siteLink(req, opts.callbackPath).toString(), tenant.actor);
      // First pull straight away, so the report isn't empty until tonight.
      if (opts.after) await opts.after(tenant.orgId).catch(() => undefined);
      return back(`ok=${encodeURIComponent(`Connected to ${label} on ${opts.label}.`)}`);
    } catch (err) {
      return back(`err=${encodeURIComponent(err instanceof Error ? err.message : `Couldn't connect to ${opts.label}.`)}`);
    }
  };
}
