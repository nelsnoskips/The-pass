"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireTenant } from "../platform/context";
import { Forbidden } from "../platform/tenant";
import { saveBriefSettings, type BriefInput } from "./settings";

export type MorningPassSaveResult = { ok: true; message: string } | { ok: false; error: string; field?: string };

/**
 * Settings → Morning pass. Returns the result to the form instead of
 * redirecting, so a mistake keeps everything typed and points at the field.
 */
export async function saveMorningPassAction(org: string, input: BriefInput): Promise<MorningPassSaveResult> {
  const { tenant } = await requireTenant(org);
  try {
    const r = await saveBriefSettings(db()!, tenant, {
      enabled: input.enabled === true,
      sendAt: String(input.sendAt ?? ""),
      channel: String(input.channel ?? ""),
      recipients: Array.isArray(input.recipients) ? input.recipients.map(String).slice(0, 50) : [],
      phones: input.phones && typeof input.phones === "object"
        ? Object.fromEntries(Object.entries(input.phones).slice(0, 50).map(([k, v]) => [String(k).toLowerCase(), String(v ?? "")]))
        : {},
    });
    if (!r.ok) return { ok: false, error: r.error, field: r.field };
    revalidatePath(`/r/${org}/settings/morning-pass`);
    return { ok: true, message: !r.changed.length ? "Nothing changed." : input.enabled ? "Saved. The morning pass goes out at the time you picked." : "Saved. The morning pass stays on Home; nothing is sent." };
  } catch (err) {
    if (err instanceof Forbidden) return { ok: false, error: "Your role can't change this." };
    throw err;
  }
}
