"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { menuNames } from "../levers";
import { requireTenant } from "../platform/context";
import { Forbidden } from "../platform/tenant";
import { zonedToUtc } from "../reservations/time";
import { deleteDraft, saveDraft, schedule, sendNow, unschedule } from "./campaigns";
import { createPromotion, setPromotionActive } from "./promotions";
import { createSegment, deleteSegment } from "./segments";

/**
 * Form posts for Segments, Campaigns and Promotions. Each one resolves
 * the tenant again (a form post doesn't go through the page guard), and
 * the library call checks the permission; a refusal comes back as a
 * plain message, never an error page.
 */

const str = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
const go = (path: string, q: Record<string, string> = {}) => {
  const qs = new URLSearchParams(q).toString();
  redirect(qs ? `${path}?${qs}` : path);
};

async function guarded<T>(fn: () => Promise<T>, refusal: string): Promise<T | { forbidden: string }> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Forbidden) return { forbidden: refusal };
    throw err;
  }
}
const isForbidden = (r: unknown): r is { forbidden: string } => typeof r === "object" && r !== null && "forbidden" in r;

/* ----------------------------------------------------------- segments -- */

const RULE_FIELDS = ["minVisits", "lapsedDays", "visitedWithinDays", "joinedWithinDays", "minNoShows", "minOnlineSpend",
  "neverVisited", "neverBooked", "smsConsent", "emailConsent", "openReward", "orderedOnline"];

export async function createSegmentAction(form: FormData) {
  const org = str(form, "org");
  const { tenant } = await requireTenant(org);
  const input = Object.fromEntries(RULE_FIELDS.map((k) => [k, str(form, k)]));
  const r = await guarded(() => createSegment(db()!, tenant, str(form, "name"), input), "Your role can't create segments.");
  if (isForbidden(r)) go(`/r/${org}/segments`, { err: r.forbidden });
  else if (!r.ok) go(`/r/${org}/segments`, { err: r.error });
  else go(`/r/${org}/segments/${r.id}`, { ok: "Segment saved." });
}

export async function deleteSegmentAction(form: FormData) {
  const org = str(form, "org");
  const { tenant } = await requireTenant(org);
  const r = await guarded(() => deleteSegment(db()!, tenant, str(form, "id")), "Your role can't delete segments.");
  go(`/r/${org}/segments`, isForbidden(r) ? { err: r.forbidden } : r ? { ok: "Segment deleted." } : { err: "That segment was already gone." });
}

/* ---------------------------------------------------------- campaigns -- */

export async function saveCampaignAction(form: FormData) {
  const org = str(form, "org");
  const { tenant } = await requireTenant(org);
  const id = str(form, "id") || undefined;
  const r = await guarded(() => saveDraft(db()!, tenant, {
    id, name: str(form, "name"), channel: str(form, "channel"), segment: str(form, "segment"),
    subject: str(form, "subject"), body: String(form.get("body") ?? ""),
  }), "Your role can't write campaigns.");
  const back = `/r/${org}/campaigns/new`;
  if (isForbidden(r)) go(back, { err: r.forbidden, ...(id ? { edit: id } : {}) });
  else if (!r.ok) go(back, { err: r.error, ...(id ? { edit: id } : {}) });
  else go(`/r/${org}/campaigns/${r.id}`, { ok: "Draft saved. Nothing has been sent." });
}

export async function deleteCampaignAction(form: FormData) {
  const org = str(form, "org");
  const { tenant } = await requireTenant(org);
  const r = await guarded(() => deleteDraft(db()!, tenant, str(form, "id")), "Your role can't delete campaigns.");
  if (isForbidden(r)) go(`/r/${org}/campaigns/${str(form, "id")}`, { err: r.forbidden });
  go(`/r/${org}/campaigns`, r ? { ok: "Draft deleted." } : { err: "Only a draft can be deleted." });
}

/** The confirm step's button: sends to exactly the number it showed. */
export async function sendCampaignAction(form: FormData) {
  const org = str(form, "org");
  const id = str(form, "id");
  const { tenant } = await requireTenant(org);
  const h = await headers();
  const expected = Number(str(form, "expected"));
  const r = await guarded(() => sendNow(db()!, tenant, id, {
    expected: Number.isInteger(expected) ? expected : -1,
    baseUrl: `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`,
  }), "Your role can't send campaigns.");
  const page = `/r/${org}/campaigns/${id}`;
  if (isForbidden(r)) go(page, { err: r.forbidden });
  else if (!r.ok) go(page, { err: r.error });
  else {
    const parts = [r.sent && `${r.sent} sent`, r.dry_run && `${r.dry_run} recorded as a dry run (no texting or email service is connected, so nothing left)`, r.failed && `${r.failed} failed`, r.skipped && `${r.skipped} skipped`].filter(Boolean).join(" · ");
    go(page, { ok: parts || "Done." });
  }
}

export async function scheduleCampaignAction(form: FormData) {
  const org = str(form, "org");
  const id = str(form, "id");
  const { tenant } = await requireTenant(org);
  const page = `/r/${org}/campaigns/${id}`;
  if (form.get("confirm") !== "on") go(page, { err: "Tick the box to confirm who it goes to." });
  const r = await guarded(() => schedule(db()!, tenant, id, str(form, "when")), "Your role can't schedule campaigns.");
  if (isForbidden(r)) go(page, { err: r.forbidden });
  else if (!r.ok) go(page, { err: r.error });
  else go(page, { ok: "Scheduled. It sends on its own at that time; the audience is counted again then." });
}

export async function unscheduleCampaignAction(form: FormData) {
  const org = str(form, "org");
  const id = str(form, "id");
  const { tenant } = await requireTenant(org);
  const r = await guarded(() => unschedule(db()!, tenant, id), "Your role can't change campaigns.");
  go(`/r/${org}/campaigns/${id}`, isForbidden(r) ? { err: r.forbidden } : r ? { ok: "Back to draft. It won't send." } : { err: "It isn't scheduled." });
}

/* --------------------------------------------------------- promotions -- */

export async function createPromotionAction(form: FormData) {
  const org = str(form, "org");
  const { tenant } = await requireTenant(org);
  const sql = db()!;
  const [v] = await sql<{ timezone: string }[]>`select timezone from venues where org_id = ${tenant.orgId} order by created_at limit 1`;
  const tz = v?.timezone ?? "America/New_York";
  const day = (k: string, time: string) => (/^\d{4}-\d{2}-\d{2}$/.test(str(form, k)) ? zonedToUtc(str(form, k), time, tz) : null);
  const ends = day("ends", "00:00");
  const names = await menuNames(sql, tenant);
  const items = new Set(names.keys());
  const r = await guarded(() => createPromotion(sql, tenant, {
    name: str(form, "name"), code: str(form, "code"), automatic: str(form, "how") === "automatic", kind: str(form, "kind"),
    percent: str(form, "percent"), amount: str(form, "amount"), itemId: str(form, "item"), minSubtotal: str(form, "min"),
    startsAt: day("starts", "00:00"),
    // The end date is inclusive: the promotion runs through that whole day.
    endsAt: ends ? new Date(ends.getTime() + 86_400_000) : null,
    maxUses: str(form, "maxUses"), maxUsesPerPhone: str(form, "maxPer"),
  }, items), "Your role can't create promotions.");
  if (isForbidden(r)) go(`/r/${org}/promotions`, { err: r.forbidden });
  else if (!r.ok) go(`/r/${org}/promotions`, { err: r.error });
  else go(`/r/${org}/promotions`, { ok: "Promotion created. It's live on the order page." });
}

export async function togglePromotionAction(form: FormData) {
  const org = str(form, "org");
  const { tenant } = await requireTenant(org);
  const active = str(form, "active") === "1";
  const r = await guarded(() => setPromotionActive(db()!, tenant, str(form, "id"), active), "Your role can't change promotions.");
  go(`/r/${org}/promotions`, isForbidden(r) ? { err: r.forbidden } : r ? { ok: active ? "Promotion resumed." : "Promotion paused." } : { err: "Promotion not found." });
}
