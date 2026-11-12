"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { requireTenant } from "../platform/context";
import { allow } from "../platform/ratelimit";
import { Forbidden } from "../platform/tenant";
import { applyChange, chat, dismissChange, newThread, undoChange } from "./index";

/** Send a message; starts a thread when there isn't one. */
export async function sendMessage(org: string, threadId: string | null, text: string): Promise<{ threadId?: string; error?: string }> {
  const sql = db();
  if (!sql) return { error: "Unavailable right now." };
  const { tenant } = await requireTenant(org);
  const body = String(text ?? "").trim().slice(0, 2000);
  if (!body) return { error: "Type a message." };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "The AI model isn't connected yet (ANTHROPIC_API_KEY). Everything here still works by hand from the menu on the left." };
  if (!(await allow(sql, "assistant", tenant.orgId, 120, 60))) return { error: "That's a lot of messages this hour. Try again in a few minutes." };
  let id = threadId && /^[0-9a-f-]{36}$/i.test(threadId) ? threadId : null;
  if (id) {
    const [own] = await sql`select 1 from chat_threads where id = ${id} and org_id = ${tenant.orgId}`;
    if (!own) id = null;
  }
  id ??= await newThread(sql, tenant, body);
  try {
    await chat(sql, tenant, id, body);
  } catch (err) {
    console.error("[assistant]", err);
    return { threadId: id, error: "The assistant couldn't finish that. Nothing was changed." };
  }
  revalidatePath(`/r/${org}`, "layout");
  return { threadId: id };
}

async function decide(form: FormData, fn: "apply" | "undo" | "dismiss") {
  const org = String(form.get("org") ?? "");
  const id = String(form.get("id") ?? "");
  const thread = String(form.get("thread") ?? "");
  const { tenant } = await requireTenant(org);
  const sql = db()!;
  let err: string | undefined;
  try {
    if (fn === "apply") {
      // For links in texts an action may send (the waitlist, on a cancellation).
      const h = await headers();
      const baseUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`;
      err = (await applyChange(sql, tenant, id, new Date(), { baseUrl })).error;
    }
    else if (fn === "undo") err = (await undoChange(sql, tenant, id)).error;
    else await dismissChange(sql, tenant, id);
  } catch (e) {
    if (!(e instanceof Forbidden)) throw e;
    err = "Your role can't make that change.";
  }
  revalidatePath(`/r/${org}`, "layout");
  redirect(`/r/${org}/chat?t=${thread}${err ? `&err=${encodeURIComponent(err)}` : ""}#c-${id}`);
}

export async function applyChangeAction(form: FormData) { await decide(form, "apply"); }
export async function undoChangeAction(form: FormData) { await decide(form, "undo"); }
export async function dismissChangeAction(form: FormData) { await decide(form, "dismiss"); }
