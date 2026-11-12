"use server";

import { revalidatePath } from "next/cache";
import type { AppConfig, AppError } from "../app/config";
import { getAppState, publishApp, saveAppDraft } from "../app/repo";
import { db } from "../db";
import { withLeverDiff } from "../levers";
import { requireTenant } from "./context";
import { can } from "./tenant";

export type AppSaveState = { errors: AppError[]; notes: string[]; config?: AppConfig; published?: boolean };

const fail = (message: string): AppSaveState => ({ errors: [{ field: "name", message }], notes: [] });

/**
 * Save the app builder's draft, and with `publish`, make it what guests
 * get. Every save is logged (app.draft_saved); a publish is logged
 * (app.published) along with each lever it moved.
 */
export async function saveAppAction(org: string, config: AppConfig, publish: boolean): Promise<AppSaveState> {
  const sql = db();
  if (!sql) return fail("Unavailable right now.");
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "manage_venue")) return fail("Your role can't change the app.");
  const state = await getAppState(sql, tenant);
  if (!state.site) return fail("Your website isn't live yet, and the app is built on it.");
  const saved = await saveAppDraft(sql, tenant, config);
  if (!saved.ok) return { errors: saved.errors, notes: [] };
  if (publish) {
    const r = await withLeverDiff(sql, tenant, "app", "app builder", () => publishApp(sql, tenant));
    if (!r.ok) return fail(r.error);
  }
  revalidatePath(`/r/${org}/app`);
  revalidatePath(`/s/${state.site.slug}/app`);
  return { errors: [], notes: saved.notes, config: saved.config, published: publish };
}
