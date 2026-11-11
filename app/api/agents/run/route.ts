import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RUNNABLE_AGENTS } from "@/lib/agent-runtime/registry";
import { runAgent } from "@/lib/agent-runtime/runner";
import { safeEqual } from "@/lib/studio/session";

/**
 * The trigger: a scheduler (Netlify scheduled function, cron, or later
 * Inngest) POSTs here to wake an agent for one restaurant.
 *
 *   POST /api/agents/run
 *   Authorization: Bearer $AGENT_CRON_SECRET
 *   { "org": "santorini", "agent": "reservations" }
 *
 * Not reachable from a browser session on purpose: runs cost money and
 * are started by the schedule, not by a click.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.AGENT_CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Agent runs are not configured." }, { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(given, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sql = db();
  if (!sql) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { org?: unknown; agent?: unknown } | null;
  const make = typeof body?.agent === "string" ? RUNNABLE_AGENTS[body.agent] : undefined;
  if (!make || typeof body?.org !== "string") {
    return NextResponse.json({ error: "Expected { org, agent }." }, { status: 400 });
  }
  const [org] = await sql<{ id: string }[]>`select id from orgs where slug = ${body.org}`;
  if (!org) return NextResponse.json({ error: "Unknown org." }, { status: 404 });

  const now = new Date();
  const outcome = await runAgent({
    sql,
    agent: make(),
    // The agent acts for the whole org; what it may do alone is decided
    // per tool by the policy layer, not by this role.
    tenant: { orgId: org.id, actor: "scheduler", role: "staff", venueIds: null },
    trigger: "schedule",
    task: `Scheduled run. Today is ${now.toISOString().slice(0, 10)} (UTC).`,
    now,
  });
  return NextResponse.json(outcome);
}
