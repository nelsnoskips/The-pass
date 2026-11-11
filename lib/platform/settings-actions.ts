"use server";

import { withLeverDiff } from "../levers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { requireTenant } from "./context";
import {
  addMember, deletePeriod, removeMember, savePeriod, saveTable, saveVenueRules, setIntegration,
} from "./settings";
import { Forbidden } from "./tenant";

/**
 * Settings forms post here. Each resolves the tenant from the session,
 * calls the settings layer (which checks permission and logs), and
 * returns to the page with a one-line result in the URL.
 */

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => Number(s(f, k));

async function run(form: FormData, page: string, work: (ctx: Awaited<ReturnType<typeof requireTenant>>) => Promise<string | null>, ok: string) {
  const org = s(form, "org");
  const ctx = await requireTenant(org);
  let error: string | null;
  try {
    error = await work(ctx);
  } catch (err) {
    if (err instanceof Forbidden) error = "Your role can't change this.";
    else throw err;
  }
  const q = error ? `err=${encodeURIComponent(error)}` : `ok=${encodeURIComponent(ok)}`;
  redirect(`/r/${org}/settings${page}?${q}`);
}

export async function addMemberAction(form: FormData) {
  await run(form, "/team", ({ tenant }) => addMember(db()!, tenant, s(form, "email"), s(form, "role")),
    `${s(form, "email")} can now sign in.`);
}

export async function removeMemberAction(form: FormData) {
  await run(form, "/team", ({ tenant }) => removeMember(db()!, tenant, s(form, "member")), "Removed.");
}

export async function saveTableAction(form: FormData) {
  await run(form, "/floor", ({ tenant }) => saveTable(db()!, tenant, s(form, "venue"), {
    id: s(form, "id") || undefined, label: s(form, "label"), area: s(form, "area"),
    minCovers: n(form, "min"), maxCovers: n(form, "max"), online: form.get("online") === "on", active: form.get("active") === "on",
  }), "Table saved.");
}

export async function savePeriodAction(form: FormData) {
  const deposit = s(form, "deposit");
  const pacing = s(form, "pacing");
  await run(form, "/floor", ({ tenant }) => savePeriod(db()!, tenant, s(form, "venue"), {
    id: s(form, "id") || undefined, name: s(form, "name"),
    daysOfWeek: form.getAll("days").map((d) => Number(d)),
    firstSeating: s(form, "first"), lastSeating: s(form, "last"), slotMinutes: n(form, "slot"),
    maxCoversPerSlot: pacing ? Number(pacing) : null,
    depositCentsPerCover: deposit ? Math.round(Number(deposit) * 100) : 0,
  }), "Service hours saved.");
}

export async function deletePeriodAction(form: FormData) {
  await run(form, "/floor", async ({ tenant }) => { await deletePeriod(db()!, tenant, s(form, "venue"), s(form, "id")); return null; }, "Service removed.");
}

export async function saveRulesAction(form: FormData) {
  await run(form, "/floor", ({ tenant }) => withLeverDiff(db()!, tenant, "reservations", "settings", () => saveVenueRules(db()!, tenant, s(form, "venue"), {
    bookingHorizonDays: n(form, "horizon"), minNoticeMinutes: n(form, "notice"), maxPartyOnline: n(form, "maxParty"),
    cancellationPolicy: s(form, "policy"), cancelCutoffHours: n(form, "cutoff"),
    phone: s(form, "phone"), address: s(form, "address"), timezone: s(form, "timezone"),
  })), "Booking rules saved.");
}

export async function integrationAction(form: FormData) {
  const status = s(form, "status") as "requested" | "connected" | "disconnected";
  await run(form, "", ({ tenant }) => setIntegration(db()!, tenant, s(form, "provider"), status, s(form, "label")),
    status === "requested" ? "Requested. The Pass team will set it up with you." : status === "connected" ? "Marked connected." : "Disconnected.");
}

export async function saveLoyaltyAction(form: FormData) {
  const { saveProgram } = await import("../guests/loyalty");
  await run(form, "/loyalty", ({ tenant }) => withLeverDiff(db()!, tenant, "loyalty", "settings", () => saveProgram(db()!, tenant, {
    active: form.get("active") === "on", visitsRequired: n(form, "visits"), reward: s(form, "reward"),
  })), "Loyalty saved.");
}
