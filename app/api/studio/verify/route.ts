import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  consumeLoginToken,
  sessionCookieOptions,
  startSession,
} from "@/lib/studio/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/studio/login?error=1", req.url));

  const email = await consumeLoginToken(token);
  if (!email) return NextResponse.redirect(new URL("/studio/login?error=1", req.url));

  const session = await startSession(email);
  if (!session) return NextResponse.redirect(new URL("/studio/login?error=1", req.url));

  const res = NextResponse.redirect(new URL("/studio", req.url));
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  return res;
}
