import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  consumeLoginToken,
  sessionCookieOptions,
  startSession,
} from "@/lib/studio/session";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(siteLink(req, "/studio/login?error=1"));

  const email = await consumeLoginToken(token);
  if (!email) return NextResponse.redirect(siteLink(req, "/studio/login?error=1"));

  const session = await startSession(email);
  if (!session) return NextResponse.redirect(siteLink(req, "/studio/login?error=1"));

  const res = NextResponse.redirect(siteLink(req, "/studio"));
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  return res;
}
