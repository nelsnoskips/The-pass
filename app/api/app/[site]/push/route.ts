import { appIsLive } from "@/lib/app/repo";
import { removePushSubscription, savePushSubscription } from "@/lib/app/push";
import { db } from "@/lib/db";
import { allow, clientAddress } from "@/lib/platform/ratelimit";
import { getPublishedSite } from "@/lib/sites/repo";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** The body, if it's small JSON; null otherwise. */
async function readJson(req: Request): Promise<unknown> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return null;
  const text = await req.text();
  if (text.length > 4096) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function siteFor(slug: string) {
  const sql = db();
  if (!sql) return null;
  const site = await getPublishedSite(sql, slug);
  return site && (await appIsLive(sql, site.orgId)) ? { sql, site } : null;
}

/** "Get updates" turned on: keep this browser's push subscription. */
export async function POST(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site: slug } = await params;
  const found = await siteFor(slug);
  if (!found) return json({ error: "Not found." }, 404);
  if (!(await allow(found.sql, "push", clientAddress(req.headers), 10, 10))) {
    return json({ error: "Too many tries. Please wait a few minutes." }, 429);
  }
  const body = await readJson(req);
  if (body === null) return json({ error: "That request wasn't understood." }, 400);
  const r = await savePushSubscription(found.sql, found.site.orgId, body);
  if (r.stored) return json({ stored: true }, 201);
  return json({ stored: false, reason: r.reason, error: r.error }, r.reason === "not_configured" ? 503 : 400);
}

/** "Get updates" turned off. */
export async function DELETE(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site: slug } = await params;
  const found = await siteFor(slug);
  if (!found) return json({ error: "Not found." }, 404);
  if (!(await allow(found.sql, "push", clientAddress(req.headers), 10, 10))) {
    return json({ error: "Too many tries. Please wait a few minutes." }, 429);
  }
  const body = (await readJson(req)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  await removePushSubscription(found.sql, found.site.orgId, endpoint);
  return json({ removed: true });
}
