import type { Sql } from "postgres";
import { SEND_WINDOW } from "../messaging/sms";
import { log } from "../reservations/repo";
import { localTime } from "../reservations/time";
import { assertCan, can, type Action, type Tenant } from "./tenant";

/**
 * The approvals queue: who a proposed text would reach (and on what
 * consent), when it would go out, whether its numbers are stale, and
 * clearing a noisy agent's proposals in one go.
 */

/** Proposals older than this were drawn up on numbers that may have moved. */
export const STALE_MS = 24 * 60 * 60 * 1000;
export const isStale = (createdAt: Date, now = new Date()) => now.getTime() - createdAt.getTime() > STALE_MS;

export interface Recipient {
  id: string;
  name: string;
  phone: string;
  lastVisitAt: Date | null;
  visits: number;
  consentAt: Date | null;
  consentSource: string | null;
  optedOutAt: Date | null;
  /** Consent on record and not opted out: the send-time check still applies. */
  canText: boolean;
}

/**
 * The guests a proposal names in its input (guest_ids), read from this
 * org only — an id from another restaurant is simply not found.
 */
export async function proposalRecipients(sql: Sql, t: Tenant, guestIds: unknown): Promise<Recipient[]> {
  assertCan(t, "view");
  const ids = (Array.isArray(guestIds) ? guestIds : []).filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x));
  if (ids.length === 0) return [];
  const rows = await sql<{ id: string; name: string; phone: string; last_visit_at: Date | null; visit_count: number; sms_consent_at: Date | null; sms_consent_source: string | null; sms_opted_out_at: Date | null }[]>`
    select id, name, phone, last_visit_at, visit_count, sms_consent_at, sms_consent_source, sms_opted_out_at
    from guests where org_id = ${t.orgId} and id = any(${ids}::uuid[])
    order by last_visit_at desc nulls last, name`;
  return rows.map((r) => ({
    id: r.id, name: r.name, phone: r.phone, lastVisitAt: r.last_visit_at, visits: r.visit_count,
    consentAt: r.sms_consent_at, consentSource: r.sms_consent_source, optedOutAt: r.sms_opted_out_at,
    canText: r.phone.startsWith("+") && r.sms_consent_at !== null && r.sms_opted_out_at === null,
  }));
}

/** When an approved text would go out: now, or the next opening of the sending window. */
export function sendTiming(now: Date, tz: string): { now: boolean; text: string } {
  const hour = Number(localTime(now, tz).slice(0, 2));
  const h12 = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "am" : "pm"}`;
  if (hour >= SEND_WINDOW.startHour && hour < SEND_WINDOW.endHour) {
    return { now: true, text: `Sends as soon as you approve (texts go out ${h12(SEND_WINDOW.startHour)}–${h12(SEND_WINDOW.endHour)}, the restaurant's time).` };
  }
  return { now: false, text: `Texts only go out ${h12(SEND_WINDOW.startHour)}–${h12(SEND_WINDOW.endHour)}, the restaurant's time. Approve it after ${h12(SEND_WINDOW.startHour)} and it sends then.` };
}

/** The permission an agent's proposals need: money for ads, messaging for texts, the venue for replies and website copy. */
export function approvalPermission(agentId: string): Action {
  if (agentId === "paid_ads") return "approve_spend";
  if (agentId === "reservations") return "message_guests";
  return "manage_venue";
}

/**
 * Dismiss every pending proposal from one agent. Needs manage_venue and
 * the permission that agent's proposals need; logged once, with the ids.
 */
export async function dismissAllFromAgent(sql: Sql, t: Tenant, agentId: string): Promise<number> {
  assertCan(t, "manage_venue");
  assertCan(t, approvalPermission(agentId));
  const rows = await sql<{ id: string }[]>`
    update agent_proposals set status = 'rejected', decided_by = ${t.actor}, decided_at = now()
    where org_id = ${t.orgId} and agent_id = ${agentId} and status = 'pending'
    returning id`;
  if (rows.length) {
    await log(sql, t.orgId, t.actor, "agent.proposals_dismissed_all", "agent", agentId, { count: rows.length, ids: rows.map((r) => r.id) });
  }
  return rows.length;
}

export const canDismissAll = (t: Tenant, agentId: string) => can(t, "manage_venue") && can(t, approvalPermission(agentId));

/**
 * Hide guests' private booking and order links (anyone holding one can
 * change or cancel) in message bodies shown to staff without
 * manage_venue: "…/booking/••••".
 */
export function maskManageLinks(body: string): string {
  return body.replace(/https?:\/\/\S*?\/s\/[^/\s]+\/(booking|order)\/[A-Za-z0-9_-]+/g, (_m, kind: string) => `…/${kind}/••••`)
    .replace(/\/s\/[^/\s]+\/(booking|order)\/[A-Za-z0-9_-]+/g, (_m, kind: string) => `…/${kind}/••••`);
}
