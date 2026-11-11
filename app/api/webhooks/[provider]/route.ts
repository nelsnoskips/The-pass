import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BadSignature, connector } from "@/lib/integrations/connectors";

/**
 * Where providers push events (Stripe payments, Square checks, Google
 * review notifications). The connector verifies the signature against
 * the raw body before anything is read; a provider that isn't built yet
 * answers 501 so it retries later instead of losing the event.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const c = connector(provider);
  if (!c) return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  if (!c.built) return NextResponse.json({ error: `${provider} isn't connected yet.` }, { status: 501 });
  const sql = db();
  if (!sql) return NextResponse.json({ error: "No database." }, { status: 503 });
  const raw = await req.text();
  try {
    const { handled } = await c.handleWebhook(sql, raw, req.headers);
    return NextResponse.json({ handled });
  } catch (err) {
    if (err instanceof BadSignature) return NextResponse.json({ error: "Bad signature." }, { status: 400 });
    throw err;
  }
}
