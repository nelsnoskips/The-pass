import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/studio/cookie";

/**
 * The client platform and the project portal were reachable by anyone
 * who typed the URL. Nothing real was behind them — every figure is
 * seeded demo data — but "no real data yet" is a fact about today, not
 * a control, and the first real client record would have made it a
 * breach with no code change.
 *
 * This is the cheap outer gate: middleware runs on the edge and cannot
 * reach Postgres, so it can only check that a session cookie is
 * present. The real check — is this a live session for an allowed
 * address — happens server-side in each protected layout, which can
 * query. A forged cookie gets past here and stops there.
 *
 * Deliberately NOT gated: /feedback and /house-issue are concept sites
 * linked as live work from the portfolio, /spec is client mock hosting,
 * /review and /status carry their own unguessable tokens, /proposals is
 * noindex but meant to be forwarded.
 */
const PROTECTED = [
  "/dashboard", "/calendar", "/campaigns", "/conversions", "/integrations",
  "/keywords", "/locations", "/reports", "/settings", "/welcome", "/portal",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const guarded = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!guarded) return NextResponse.next();

  if (req.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/studio/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*", "/calendar/:path*", "/campaigns/:path*",
    "/conversions/:path*", "/integrations/:path*", "/keywords/:path*",
    "/locations/:path*", "/reports/:path*", "/settings/:path*",
    "/welcome/:path*", "/portal/:path*",
    "/dashboard", "/calendar", "/campaigns", "/conversions", "/integrations",
    "/keywords", "/locations", "/reports", "/settings", "/welcome", "/portal",
  ],
};
