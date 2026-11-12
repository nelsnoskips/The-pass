import { notFound } from "next/navigation";
import { loadGuestApp, type GuestApp } from "@/lib/app/repo";
import { db } from "@/lib/db";
import { currentIdentity } from "@/lib/platform/session";

export interface AppPage extends GuestApp { base: string; q: string }

/**
 * Every app page starts here. Guests get the published app; a draft is
 * shown only for ?preview=draft from someone signed in to this
 * restaurant, and is otherwise ignored.
 */
export async function loadAppPage(slug: string, preview?: string): Promise<AppPage> {
  const sql = db();
  if (!sql) notFound();
  const wantDraft = preview === "draft";
  const viewer = wantDraft ? await currentIdentity() : null;
  const app = await loadGuestApp(sql, slug, { wantDraft, viewer });
  if (!app) notFound();
  const base = `/s/${app.site.slug}`;
  return { ...app, base, q: app.draft ? "?preview=draft" : "" };
}
