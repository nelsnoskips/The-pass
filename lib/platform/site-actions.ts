"use server";

import { withLeverDiff } from "../levers";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import type { SiteContent } from "../sites/content";
import { publishVersion, saveVersion, siteForOrg } from "../sites/repo";
import { requireTenant } from "./context";
import { can } from "./tenant";

export type SaveState = { errors: string[]; versionId?: string; published?: boolean };

/** Save the editor's content as a new draft, and optionally make it live. */
export async function saveSite(org: string, content: SiteContent, note: string, publish: boolean): Promise<SaveState> {
  const sql = db();
  if (!sql) return { errors: ["Unavailable."] };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "manage_venue")) return { errors: ["Your role can't edit the website."] };
  const site = await siteForOrg(sql, tenant);
  if (!site) return { errors: ["This restaurant has no website yet."] };
  const saved = await saveVersion(sql, tenant, site.id, content, note.trim().slice(0, 200) || null);
  if (!saved.ok) return { errors: saved.errors };
  if (publish) await withLeverDiff(sql, tenant, "website", "website editor", () => publishVersion(sql, tenant, site.id, saved.versionId));
  revalidatePath(`/r/${org}/website`);
  revalidatePath(`/s/${site.slug}`);
  return { errors: [], versionId: saved.versionId, published: publish };
}

export async function publishSiteVersion(org: string, versionId: string): Promise<{ error: string | null }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "manage_venue")) return { error: "Your role can't publish." };
  const site = await siteForOrg(sql, tenant);
  if (!site || !(await withLeverDiff(sql, tenant, "website", "website versions", () => publishVersion(sql, tenant, site.id, versionId)))) return { error: "Version not found." };
  revalidatePath(`/r/${org}/website`);
  revalidatePath(`/s/${site.slug}`);
  return { error: null };
}
