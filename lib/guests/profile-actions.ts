"use server";

import { redirect } from "next/navigation";
import { db } from "../db";
import { requireTenant } from "../platform/context";
import { can } from "../platform/tenant";
import { updateGuest } from "./profile";

/** Save a guest's name, email, tags and notes from their profile. */
export async function updateGuestAction(form: FormData) {
  const get = (k: string) => String(form.get(k) ?? "");
  const org = get("org");
  const id = get("id");
  const { tenant } = await requireTenant(org);
  const back = (q: string) => redirect(`/r/${org}/guests/${encodeURIComponent(id)}?${q}`);
  if (!can(tenant, "manage_venue")) back(`err=${encodeURIComponent("Your role can't edit guests.")}`);
  const r = await updateGuest(db()!, tenant, id, { name: get("name"), email: get("email"), tags: get("tags"), notes: get("notes") });
  if (!r.ok) back(`err=${encodeURIComponent(r.error)}`);
  else back(`ok=${encodeURIComponent(r.changed.length ? "Saved." : "Nothing changed.")}`);
}
