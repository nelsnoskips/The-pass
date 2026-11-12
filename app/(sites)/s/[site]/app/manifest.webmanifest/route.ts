import { buildManifest } from "@/lib/app/config";
import { loadGuestApp } from "@/lib/app/repo";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** The web app manifest: what makes the app installable, from the published config. */
export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const sql = db();
  const app = sql ? await loadGuestApp(sql, site) : null;
  if (!app) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(buildManifest(app.config, `/s/${app.site.slug}`)), {
    headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
