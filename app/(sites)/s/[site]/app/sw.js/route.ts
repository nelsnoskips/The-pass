import { loadGuestApp } from "@/lib/app/repo";
import { serviceWorkerSource } from "@/lib/app/sw";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** The app's service worker, allowed to control the whole site (/s/<site>/). */
export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const sql = db();
  const app = sql ? await loadGuestApp(sql, site) : null;
  if (!app) return new Response("// No app here.", { status: 404, headers: { "content-type": "application/javascript; charset=utf-8" } });
  const base = `/s/${app.site.slug}`;
  const [row] = await sql!<{ published_at: Date | null }[]>`select published_at from app_configs where org_id = ${app.site.orgId}`;
  const version = String(row?.published_at?.getTime() ?? 0);
  return new Response(serviceWorkerSource(base, version), {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "service-worker-allowed": `${base}/`,
      "cache-control": "no-cache",
    },
  });
}
