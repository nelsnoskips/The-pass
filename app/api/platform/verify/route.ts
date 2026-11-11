import { NextResponse } from "next/server";
import { consumeMemberToken, MEMBER_COOKIE, memberCookieOptions, startMemberSession } from "@/lib/platform/session";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const email = token ? await consumeMemberToken(token) : null;
  const session = email ? await startMemberSession(email) : null;
  if (!session) return NextResponse.redirect(siteLink(req, "/login?error=1"));
  const res = NextResponse.redirect(siteLink(req, "/r"));
  res.cookies.set(MEMBER_COOKIE, session, memberCookieOptions);
  return res;
}
