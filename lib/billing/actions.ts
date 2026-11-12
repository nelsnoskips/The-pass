"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../db";
import { requireTenant } from "../platform/context";
import { Forbidden } from "../platform/tenant";
import { requestPlanChange, setPlan } from "./entitlements";

/** Only ever send people back inside their own restaurant. */
const backTo = (org: string, raw: unknown, fallback: string) => {
  const s = String(raw ?? "");
  return s.startsWith(`/r/${org}/`) && !s.includes("//", 1) ? s.split("?")[0] : fallback;
};
const go = (path: string, q: Record<string, string>) => redirect(`${path}?${new URLSearchParams(q)}`);

/** "Talk to us about upgrading": records the request and tells the founder. No payment. */
export async function requestPlanAction(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant } = await requireTenant(org);
  const back = backTo(org, form.get("back"), `/r/${org}/settings/billing`);
  let r: Awaited<ReturnType<typeof requestPlanChange>>;
  try {
    r = await requestPlanChange(db()!, tenant, {
      plan: String(form.get("plan") ?? "the_pass"), feature: String(form.get("feature") ?? "") || null, note: String(form.get("note") ?? ""),
    });
  } catch (err) {
    if (!(err instanceof Forbidden)) throw err;
    return go(back, { err: "Ask an owner or manager to request a plan change." });
  }
  if (!r.ok) return go(back, { err: r.error });
  revalidatePath(back);
  go(back, { ok: r.already ? "We already have your request. Someone from The Pass will be in touch." : "Thanks — someone from The Pass will be in touch. Nothing has changed yet, and you won't be charged." });
}

/** The Pass's own staff set the plan. Logged as plan.changed. */
export async function setPlanAction(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant } = await requireTenant(org);
  const page = `/r/${org}/settings/billing`;
  let r: Awaited<ReturnType<typeof setPlan>>;
  try {
    r = await setPlan(db()!, tenant, {
      plan: String(form.get("plan") ?? ""),
      founding: form.get("founding") === "on",
      foundingLockedUntil: String(form.get("lock") ?? ""),
      locations: Number(form.get("locations") ?? 1),
    });
  } catch (err) {
    if (!(err instanceof Forbidden)) throw err;
    return go(page, { err: "Only The Pass's team can change the plan. You can ask for a change below." });
  }
  if (!r.ok) return go(page, { err: r.error });
  revalidatePath(`/r/${org}`, "layout");
  go(page, { ok: r.changed.length ? "Plan saved. It's in the change log." : "Nothing changed." });
}
