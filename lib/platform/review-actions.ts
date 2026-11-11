"use server";

import { redirect } from "next/navigation";
import { db } from "../db";
import { pullReviews, pushHours, replyToReview } from "../integrations/google";
import { requireTenant } from "./context";
import { can } from "./tenant";

const back = (org: string, q: string) => redirect(`/r/${org}/reviews?${q}`);

export async function syncGoogle(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant, venues } = await requireTenant(org);
  if (!can(tenant, "manage_venue")) back(org, `err=${encodeURIComponent("Your role can't sync.")}`);
  let msg: string;
  try {
    const hours = venues[0] ? await pushHours(db()!, tenant.orgId, venues[0].id) : 0;
    const n = await pullReviews(db()!, tenant.orgId);
    msg = `ok=${encodeURIComponent(`Hours sent to Google (${hours} openings). ${n} reviews checked.`)}`;
  } catch (err) {
    msg = `err=${encodeURIComponent(err instanceof Error ? err.message : "Sync failed.")}`;
  }
  back(org, msg);
}

export async function postReply(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant } = await requireTenant(org);
  const reply = String(form.get("reply") ?? "").trim().slice(0, 4000);
  if (!can(tenant, "manage_venue")) back(org, `err=${encodeURIComponent("Your role can't reply to reviews.")}`);
  if (reply.length < 2) back(org, `err=${encodeURIComponent("Write a reply first.")}`);
  let msg: string;
  try {
    await replyToReview(db()!, tenant.orgId, String(form.get("review") ?? ""), reply, tenant.actor);
    msg = `ok=${encodeURIComponent("Reply posted on Google.")}`;
  } catch (err) {
    msg = `err=${encodeURIComponent(err instanceof Error ? err.message : "Couldn't post the reply.")}`;
  }
  back(org, msg);
}
