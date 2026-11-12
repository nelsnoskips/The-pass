import type { Sql } from "postgres";
import { normalizePhone } from "../guests/phone";
import { log } from "../reservations/repo";
import { assertCan, type Tenant } from "../platform/tenant";

/**
 * Whether the morning pass is sent, when (the restaurant's own time),
 * how (email or text) and to whom. Recipients can only be people on the
 * team: their emails are stored, and a text goes to the mobile number on
 * their team record. Off until an owner or manager turns it on.
 */

export type BriefChannel = "email" | "sms";

export interface BriefSettings {
  enabled: boolean;
  /** Venue-local "HH:MM". */
  sendAt: string;
  channel: BriefChannel;
  /** Team members' emails, lowercased. */
  recipients: string[];
  updatedBy: string | null;
  updatedAt: Date | null;
}

export const DEFAULT_BRIEF: BriefSettings = { enabled: false, sendAt: "09:00", channel: "email", recipients: [], updatedBy: null, updatedAt: null };

export async function readBriefSettings(sql: Sql, t: Tenant): Promise<BriefSettings> {
  assertCan(t, "view");
  const [r] = await sql<{ enabled: boolean; send_at: string; channel: BriefChannel; recipients: string[]; updated_by: string | null; updated_at: Date }[]>`
    select enabled, send_at::text as send_at, channel, recipients, updated_by, updated_at from brief_settings where org_id = ${t.orgId}`;
  if (!r) return { ...DEFAULT_BRIEF };
  return { enabled: r.enabled, sendAt: r.send_at.slice(0, 5), channel: r.channel, recipients: r.recipients, updatedBy: r.updated_by, updatedAt: r.updated_at };
}

export interface BriefInput {
  enabled: boolean;
  sendAt: string;
  channel: string;
  recipients: string[];
  /** Mobile numbers typed for team members, by email. Needed for texts. */
  phones?: Record<string, string>;
}

export type BriefSaveResult = { ok: true; changed: string[] } | { ok: false; error: string; field: "sendAt" | "channel" | "recipients" | `phone:${string}` };

export async function saveBriefSettings(sql: Sql, t: Tenant, input: BriefInput): Promise<BriefSaveResult> {
  assertCan(t, "manage_venue");
  const sendAt = input.sendAt.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sendAt)) return { ok: false, error: "Pick a time to send it, like 9:00 AM.", field: "sendAt" };
  if (input.channel !== "email" && input.channel !== "sms") return { ok: false, error: "Choose email or text.", field: "channel" };
  const channel = input.channel as BriefChannel;

  const members = await sql<{ email: string; phone: string | null }[]>`
    select lower(email) as email, phone from org_members where org_id = ${t.orgId}`;
  const team = new Map(members.map((m) => [m.email, m]));
  const recipients = [...new Set(input.recipients.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const stranger = recipients.find((e) => !team.has(e));
  if (stranger) return { ok: false, error: `${stranger} isn't on the team. Add them in Team first.`, field: "recipients" };
  if (input.enabled && recipients.length === 0) return { ok: false, error: "Pick at least one person to send it to.", field: "recipients" };

  // A text needs a mobile number for everyone it goes to.
  const phones = new Map<string, string>();
  for (const e of recipients) {
    const typed = input.phones?.[e]?.trim();
    const raw = typed || (channel === "sms" ? team.get(e)?.phone ?? "" : "");
    if (!raw) {
      if (channel === "sms") return { ok: false, error: `Add a mobile number for ${e}, or send by email.`, field: `phone:${e}` };
      continue;
    }
    const phone = normalizePhone(raw);
    if (!phone) return { ok: false, error: `${raw} doesn't look like a mobile number (for ${e}).`, field: `phone:${e}` };
    phones.set(e, phone);
  }

  const before = await readBriefSettings(sql, t);
  const after = { enabled: input.enabled, sendAt, channel, recipients };
  const changed = (["enabled", "sendAt", "channel", "recipients"] as const)
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  const phoneChanges = [...phones].filter(([e, p]) => team.get(e)?.phone !== p);
  await sql.begin(async (tx) => {
    await tx`
      insert into brief_settings (org_id, enabled, send_at, channel, recipients, updated_by, updated_at)
      values (${t.orgId}, ${after.enabled}, ${sendAt}, ${channel}, ${recipients}, ${t.actor}, now())
      on conflict (org_id) do update set enabled = excluded.enabled, send_at = excluded.send_at, channel = excluded.channel,
        recipients = excluded.recipients, updated_by = excluded.updated_by, updated_at = now()`;
    for (const [e, p] of phoneChanges) {
      await tx`update org_members set phone = ${p} where org_id = ${t.orgId} and lower(email) = ${e}`;
    }
    if (changed.length || phoneChanges.length) {
      const detail: Record<string, unknown> = Object.fromEntries(changed.map((k) => [k, { before: before[k], after: after[k] }]));
      if (phoneChanges.length) detail.phonesFor = phoneChanges.map(([e]) => e);
      await log(tx, t.orgId, t.actor, "brief.settings_saved", "brief_settings", t.orgId, detail);
    }
  });
  return { ok: true, changed: [...changed, ...phoneChanges.map(([e]) => `phone:${e}`)] };
}
