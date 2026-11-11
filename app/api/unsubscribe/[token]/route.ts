import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readUnsubscribeToken, unsubscribeEmail } from "@/lib/messaging/email";

/**
 * RFC 8058 one-click unsubscribe: mail apps POST here from their own
 * "Unsubscribe" button. GET goes to the confirmation page instead, so a
 * scanner following links can't unsubscribe anyone.
 */
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = readUnsubscribeToken(token);
  const sql = db();
  if (!id || !sql) return NextResponse.json({ error: "Invalid link." }, { status: 400 });
  await unsubscribeEmail(sql, id);
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(new URL(`/u/${token}`, req.url));
}
