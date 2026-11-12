"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AGENT_GOALS, saveAgentSettings, type SettingsPatch } from "../agent-runtime/settings";
import { stationName } from "../agent-runtime/catalog";
import { db } from "../db";
import { requireTenant } from "./context";
import { Forbidden } from "./tenant";

/**
 * The agent page's forms. Each resolves the tenant from the session,
 * saves through lib/agent-runtime/settings (which checks manage_venue and
 * writes the change log), and returns to the page with a one-line result.
 */

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function save(form: FormData, patch: SettingsPatch, ok: string) {
  const org = s(form, "org");
  const agent = s(form, "agent");
  const { tenant } = await requireTenant(org);
  let error: string | null = null;
  try {
    const r = await saveAgentSettings(db()!, tenant, agent, patch);
    if (!r.ok) error = r.error;
    else if (!r.changed.length) ok = "Nothing changed.";
  } catch (err) {
    if (err instanceof Forbidden) error = "Your role can't change stations.";
    else throw err;
  }
  revalidatePath(`/r/${org}/agents`, "layout");
  const q = error ? `err=${encodeURIComponent(error)}` : `ok=${encodeURIComponent(ok)}`;
  redirect(`/r/${org}/agents/${encodeURIComponent(agent)}?${q}`);
}

/** One form per choice: the wanted state rides in a hidden field. */
export async function setAgentEnabledAction(form: FormData) {
  const on = s(form, "enabled") === "on";
  await save(form, { enabled: on }, `The ${stationName(s(form, "agent"))} station is ${on ? "on" : "off"}.`);
}

export async function saveAgentInstructionsAction(form: FormData) {
  await save(form, { instructions: String(form.get("instructions") ?? "") }, "Instructions saved. The Pass uses them from this station's next run.");
}

export async function saveAgentGoalsAction(form: FormData) {
  const goals: Record<string, string> = {};
  for (const def of AGENT_GOALS[s(form, "agent")] ?? []) {
    if (form.has(def.key)) goals[def.key] = s(form, def.key);
  }
  await save(form, { goals }, "Limits saved.");
}
