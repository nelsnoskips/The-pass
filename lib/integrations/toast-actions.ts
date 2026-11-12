"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireTenant } from "../platform/context";
import { Forbidden } from "../platform/tenant";
import { connectToastAs, disconnectToast, importToastMenu, syncToastAs, ToastError } from "./toast";

/**
 * Settings → Toast. Each action resolves the tenant from the session and
 * returns a plain result for the form to show inline. Credentials go in,
 * never come back out, and are never logged.
 */

export interface ToastActionResult {
  error: string | null;
  field?: "clientId" | "clientSecret" | "restaurantGuid";
  message?: string;
  versionId?: string;
}

async function guarded(org: string, work: (ctx: Awaited<ReturnType<typeof requireTenant>>) => Promise<ToastActionResult>): Promise<ToastActionResult> {
  const sql = db();
  if (!sql) return { error: "Unavailable right now." };
  const ctx = await requireTenant(org);
  try {
    const r = await work(ctx);
    revalidatePath(`/r/${org}/settings`);
    return r;
  } catch (err) {
    if (err instanceof Forbidden) return { error: "Your role can't change connections." };
    if (err instanceof ToastError) return { error: err.message, field: err.field };
    console.error("toast action", err instanceof Error ? err.name : "error");
    return { error: "Something went wrong talking to Toast. Try again in a minute." };
  }
}

export async function connectToastAction(org: string, input: { clientId: string; clientSecret: string; restaurantGuid: string }): Promise<ToastActionResult> {
  return guarded(org, async ({ tenant }) => {
    const name = await connectToastAs(db()!, tenant, {
      clientId: String(input?.clientId ?? ""), clientSecret: String(input?.clientSecret ?? ""), restaurantGuid: String(input?.restaurantGuid ?? ""),
    });
    // First sync straight away, so the owner sees it working.
    const r = await syncToastAs(db()!, tenant);
    return { error: null, message: r.ok ? `Connected to ${name}. ${r.rows} check${r.rows === 1 ? "" : "s"} read from the last 30 days.` : `Connected to ${name}. The first sync didn't finish: ${r.error}` };
  });
}

export async function syncToastAction(org: string): Promise<ToastActionResult> {
  return guarded(org, async ({ tenant }) => {
    const r = await syncToastAs(db()!, tenant);
    return r.ok
      ? { error: null, message: `Synced. ${r.rows} new check${r.rows === 1 ? "" : "s"}, ${r.matched ?? 0} matched to guests.` }
      : { error: r.error ?? "Toast sync failed." };
  });
}

export async function importToastMenuAction(org: string): Promise<ToastActionResult> {
  return guarded(org, async ({ tenant }) => {
    const r = await importToastMenu(db()!, tenant);
    return r.ok
      ? { error: null, versionId: r.versionId, message: `Draft saved with ${r.items} dish${r.items === 1 ? "" : "es"} from ${r.menus} menu${r.menus === 1 ? "" : "s"}${r.skipped ? ` (${r.skipped} left out: over the website's limits or unnamed)` : ""}. Review it on the Website page; nothing is live until you publish.` }
      : { error: r.error };
  });
}

export async function disconnectToastAction(org: string): Promise<ToastActionResult> {
  return guarded(org, async ({ tenant }) => {
    await disconnectToast(db()!, tenant);
    return { error: null, message: "Toast disconnected. The credentials were deleted from The Pass." };
  });
}
