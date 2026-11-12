import type { Sql } from "postgres";
import { getProgram, saveProgram } from "../guests/loyalty";
import { getOrderingSettings, orderableItems, saveOrderingSettings, setKitchenState } from "../ordering";
import { getVenueRules, saveVenueRules } from "../platform/settings";
import { assertCan, can, type Action, type Tenant } from "../platform/tenant";
import { log } from "../reservations/repo";
import type { SiteContent } from "../sites/content";
import { getVersion, publishVersion, saveVersion, siteForOrg } from "../sites/repo";
import { DEFAULT_TZ, formatIn } from "../platform/when";

/**
 * Levers: the settings each part of the business runs on, defined once.
 * The assistant reads and changes them through this module; the
 * settings screens show their history from the same change records. A
 * lever change is always written as `lever.changed` with the pillar,
 * the key, before and after, and who asked — so "what changed, when,
 * and who said so" has one answer everywhere.
 *
 * risk: "auto"    — internal and reversible: applied at once, with Undo.
 *       "confirm" — public, money or switching something on/off: the
 *                   exact before → after is shown and a person presses Apply.
 */

export type Pillar = "reservations" | "ordering" | "website" | "loyalty";
export const PILLARS: Record<Pillar, { label: string; page: string }> = {
  reservations: { label: "Reservations", page: "settings/floor" },
  ordering: { label: "Online ordering", page: "orders" },
  website: { label: "Website", page: "website" },
  loyalty: { label: "Loyalty", page: "settings/loyalty" },
};

type Kind = "int" | "bool" | "text" | "money" | "percent" | "minutes_from_now" | "items";
export interface LeverDef {
  pillar: Pillar;
  key: string;
  label: string;
  help: string;
  kind: Kind;
  min?: number;
  max?: number;
  unit?: string;
  risk: "auto" | "confirm";
  requires: Action;
}

export const LEVERS: LeverDef[] = [
  // Reservations (the first venue)
  { pillar: "reservations", key: "booking_window_days", label: "Booking window", help: "How many days ahead guests can book online.", kind: "int", min: 1, max: 365, unit: "days", risk: "auto", requires: "manage_venue" },
  { pillar: "reservations", key: "min_notice_minutes", label: "Minimum notice", help: "How close to the time a guest can still book online.", kind: "int", min: 0, max: 2880, unit: "minutes", risk: "auto", requires: "manage_venue" },
  { pillar: "reservations", key: "max_party_online", label: "Largest online party", help: "Bigger parties are asked to call.", kind: "int", min: 1, max: 30, unit: "guests", risk: "auto", requires: "manage_venue" },
  { pillar: "reservations", key: "cancel_cutoff_hours", label: "Cancellation cut-off", help: "Guests can change or cancel from their link until this many hours before.", kind: "int", min: 0, max: 168, unit: "hours", risk: "auto", requires: "manage_venue" },
  { pillar: "reservations", key: "cancellation_policy", label: "Cancellation policy", help: "Shown to every guest before they book.", kind: "text", max: 600, risk: "confirm", requires: "manage_venue" },
  { pillar: "reservations", key: "phone", label: "Restaurant phone", help: "Shown on bookings and texts.", kind: "text", max: 40, risk: "confirm", requires: "manage_venue" },
  // Online ordering
  { pillar: "ordering", key: "pickup_enabled", label: "Pickup orders", help: "Take pickup orders on the website.", kind: "bool", risk: "confirm", requires: "manage_venue" },
  { pillar: "ordering", key: "catering_enabled", label: "Catering orders", help: "Take catering orders on the website.", kind: "bool", risk: "confirm", requires: "manage_venue" },
  { pillar: "ordering", key: "tax_percent", label: "Sales tax", help: "Added to every order.", kind: "percent", min: 0, max: 25, unit: "%", risk: "confirm", requires: "manage_venue" },
  { pillar: "ordering", key: "prep_minutes", label: "Pickup prep time", help: "Earliest pickup is this long after ordering.", kind: "int", min: 5, max: 240, unit: "minutes", risk: "auto", requires: "manage_venue" },
  { pillar: "ordering", key: "catering_notice_hours", label: "Catering notice", help: "How far ahead catering must be ordered.", kind: "int", min: 2, max: 720, unit: "hours", risk: "auto", requires: "manage_venue" },
  { pillar: "ordering", key: "catering_minimum", label: "Catering minimum", help: "Smallest catering order.", kind: "money", min: 0, max: 100_000, risk: "auto", requires: "manage_venue" },
  { pillar: "ordering", key: "paused", label: "Pickup pause", help: "No new pickup orders for this many minutes (0 resumes).", kind: "minutes_from_now", min: 0, max: 240, unit: "minutes", risk: "auto", requires: "book" },
  { pillar: "ordering", key: "sold_out", label: "Sold out", help: "Dishes hidden from the order page. Give menu item ids.", kind: "items", risk: "auto", requires: "book" },
  // Website (published content; every change publishes a new version)
  { pillar: "website", key: "announcement", label: "Announcement bar", help: "The line across the top of every page. Empty hides it.", kind: "text", max: 160, risk: "confirm", requires: "manage_venue" },
  { pillar: "website", key: "hero_headline", label: "Homepage headline", help: "The big line on the homepage.", kind: "text", max: 120, risk: "confirm", requires: "manage_venue" },
  { pillar: "website", key: "contact_phone", label: "Phone on the website", help: "Shown in Visit and the footer.", kind: "text", max: 40, risk: "confirm", requires: "manage_venue" },
  { pillar: "website", key: "contact_email", label: "Email on the website", help: "Shown in Visit.", kind: "text", max: 120, risk: "confirm", requires: "manage_venue" },
  { pillar: "website", key: "map_link", label: "Map link", help: "Where 'Get directions' goes.", kind: "text", max: 300, risk: "confirm", requires: "manage_venue" },
  { pillar: "website", key: "instagram_link", label: "Instagram", help: "Your Instagram handle or link.", kind: "text", max: 120, risk: "confirm", requires: "manage_venue" },
  // Loyalty
  { pillar: "loyalty", key: "active", label: "Loyalty program", help: "Count visits and earn rewards.", kind: "bool", risk: "confirm", requires: "manage_venue" },
  { pillar: "loyalty", key: "visits_required", label: "Visits per reward", help: "Every this many visits earns the reward.", kind: "int", min: 2, max: 50, unit: "visits", risk: "auto", requires: "manage_venue" },
  { pillar: "loyalty", key: "reward", label: "Reward", help: "What the guest gets.", kind: "text", max: 120, risk: "auto", requires: "manage_venue" },
];

export const lever = (pillar: string, key: string) => LEVERS.find((l) => l.pillar === pillar && l.key === key);

export type LeverValue = number | boolean | string | string[] | null;

/** Turn what was typed or said into a value of the right kind, or say why not. */
export function parseLeverValue(def: LeverDef, raw: string): { ok: true; value: LeverValue } | { ok: false; error: string } {
  const s = String(raw ?? "").trim();
  const range = (n: number) => (def.min !== undefined && n < def.min) || (def.max !== undefined && n > def.max)
    ? `${def.label} must be between ${def.min} and ${def.max}${def.unit ? ` ${def.unit}` : ""}.` : null;
  switch (def.kind) {
    case "int":
    case "minutes_from_now": {
      const n = Number(s.replace(/[^\d.-]/g, ""));
      if (!s || !Number.isInteger(n)) return { ok: false, error: `${def.label} needs a whole number.` };
      const bad = range(n);
      return bad ? { ok: false, error: bad } : { ok: true, value: n };
    }
    case "percent": {
      const n = Number(s.replace(/[%\s]/g, ""));
      if (!s || !Number.isFinite(n)) return { ok: false, error: `${def.label} needs a percentage.` };
      const bad = range(n);
      return bad ? { ok: false, error: bad } : { ok: true, value: Math.round(n * 1000) / 1000 };
    }
    case "money": {
      const n = Number(s.replace(/[$,\s]/g, ""));
      if (!s || !Number.isFinite(n)) return { ok: false, error: `${def.label} needs an amount in dollars.` };
      const bad = range(n);
      return bad ? { ok: false, error: bad } : { ok: true, value: Math.round(n * 100) }; // cents
    }
    case "bool": {
      if (/^(true|on|yes|enable|enabled|1)$/i.test(s)) return { ok: true, value: true };
      if (/^(false|off|no|disable|disabled|0)$/i.test(s)) return { ok: true, value: false };
      return { ok: false, error: `${def.label} is on or off.` };
    }
    case "items":
      return { ok: true, value: s ? [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))].slice(0, 200) : [] };
    case "text": {
      if (def.max !== undefined && s.length > def.max) return { ok: false, error: `${def.label} can be at most ${def.max} characters.` };
      return { ok: true, value: s };
    }
  }
}

/**
 * A lever's value in words. `tz` is the restaurant's timezone, for
 * values that are times (a pickup pause "until 6:31 PM"): pass it
 * explicitly, because the server runs in UTC.
 */
export function formatLever(def: LeverDef, v: LeverValue, names?: Map<string, string>, tz: string = DEFAULT_TZ): string {
  if (v === null || v === undefined) return "—";
  switch (def.kind) {
    case "bool": return v ? "On" : "Off";
    case "money": return `$${((v as number) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    case "percent": return `${v}%`;
    case "items": return (v as string[]).length ? (v as string[]).map((id) => names?.get(id) ?? id).join(", ") : "Nothing";
    case "minutes_from_now": return v ? `Paused until ${formatIn(v as string, tz, "time")}` : "Taking orders";
    case "text": return (v as string) || "(empty)";
    default: return `${v}${def.unit ? ` ${def.unit}` : ""}`;
  }
}

/* ------------------------------------------------------------ read -- */

/** The restaurant's timezone (its first venue's), for formatting lever values. */
export async function orgTimezone(sql: Sql, t: Tenant): Promise<string> {
  const [v] = await sql<{ timezone: string }[]>`select timezone from venues where org_id = ${t.orgId} order by created_at limit 1`;
  return v?.timezone || DEFAULT_TZ;
}

async function firstVenue(sql: Sql, t: Tenant) {
  const [v] = await sql<{ id: string }[]>`select id from venues where org_id = ${t.orgId} order by created_at limit 1`;
  return v?.id ?? null;
}

async function publishedContent(sql: Sql, t: Tenant): Promise<{ siteId: string; content: SiteContent } | null> {
  const site = await siteForOrg(sql, t);
  if (!site?.publishedVersionId) return null;
  const content = await getVersion(sql, t, site.publishedVersionId);
  return content ? { siteId: site.id, content } : null;
}

const WEBSITE_FIELD: Record<string, (c: SiteContent) => string> = {
  announcement: (c) => c.announcement, hero_headline: (c) => c.hero.headline, contact_phone: (c) => c.contact.phone,
  contact_email: (c) => c.contact.email, map_link: (c) => c.contact.mapUrl, instagram_link: (c) => c.social.instagram,
};

/** Current values for a pillar (or every pillar), as stored. */
export async function readLevers(sql: Sql, t: Tenant, pillar?: Pillar): Promise<{ def: LeverDef; value: LeverValue }[]> {
  assertCan(t, "view");
  const want = (p: Pillar) => !pillar || pillar === p;
  const out: { def: LeverDef; value: LeverValue }[] = [];
  const push = (p: Pillar, values: Record<string, LeverValue>) =>
    LEVERS.filter((l) => l.pillar === p).forEach((def) => out.push({ def, value: values[def.key] ?? null }));

  if (want("reservations")) {
    const venueId = await firstVenue(sql, t);
    const r = venueId ? await getVenueRules(sql, t, venueId) : null;
    if (r) push("reservations", {
      booking_window_days: r.bookingHorizonDays, min_notice_minutes: r.minNoticeMinutes, max_party_online: r.maxPartyOnline,
      cancel_cutoff_hours: r.cancelCutoffHours, cancellation_policy: r.cancellationPolicy, phone: r.phone,
    });
  }
  if (want("ordering")) {
    const o = await getOrderingSettings(sql, t.orgId);
    const paused = o.pausedUntil && o.pausedUntil > new Date() ? o.pausedUntil.toISOString() : null;
    push("ordering", {
      pickup_enabled: o.pickupEnabled, catering_enabled: o.cateringEnabled, tax_percent: o.taxBps / 100, prep_minutes: o.leadMinutes,
      catering_notice_hours: o.cateringLeadHours, catering_minimum: o.cateringMinCents, paused, sold_out: o.soldOut,
    });
  }
  if (want("website")) {
    const site = await publishedContent(sql, t);
    if (site) push("website", Object.fromEntries(Object.entries(WEBSITE_FIELD).map(([k, f]) => [k, f(site.content)])));
  }
  if (want("loyalty")) {
    const p = await getProgram(sql, t);
    push("loyalty", { active: p.active, visits_required: p.visitsRequired, reward: p.reward });
  }
  return out;
}

/** Names for menu item ids, so "sold out" reads as dishes, not ids. */
export async function menuNames(sql: Sql, t: Tenant): Promise<Map<string, string>> {
  const site = await publishedContent(sql, t);
  return site ? new Map([...orderableItems(site.content).values()].map((i) => [i.id, i.name])) : new Map();
}

/* ----------------------------------------------------------- write -- */

export type SetResult = { ok: true; before: LeverValue; after: LeverValue } | { ok: false; error: string };

/**
 * Change one lever. Checks the caller's permission, validates through the
 * pillar's own save function (so its rules apply here too), and records
 * one `lever.changed` entry. `via` says how the change was asked for
 * ("assistant", "settings").
 */
export async function setLever(
  sql: Sql, t: Tenant, pillar: string, key: string, raw: string, via: string, now = new Date(),
): Promise<SetResult> {
  const def = lever(pillar, key);
  if (!def) return { ok: false, error: `There's no setting called ${pillar}.${key}.` };
  if (!can(t, def.requires)) return { ok: false, error: `Your role can't change ${def.label.toLowerCase()}.` };
  const parsed = parseLeverValue(def, raw);
  if (!parsed.ok) return parsed;
  let value = parsed.value;
  const current = (await readLevers(sql, t, def.pillar)).find((l) => l.def.key === key);
  if (!current) return { ok: false, error: `${PILLARS[def.pillar].label} isn't set up yet.` };
  const before = current.value;

  if (def.kind === "items") {
    const names = await menuNames(sql, t);
    const unknown = (value as string[]).filter((id) => !names.has(id));
    if (unknown.length) return { ok: false, error: `Not on the menu: ${unknown.join(", ")}.` };
  }
  if (def.kind === "minutes_from_now") value = value ? new Date(now.getTime() + (value as number) * 60_000).toISOString() : null;
  if (JSON.stringify(before) === JSON.stringify(value)) return { ok: false, error: `${def.label} is already ${formatLever(def, value, undefined, await orgTimezone(sql, t))}.` };

  let err: string | null = null;
  if (def.pillar === "reservations") {
    const venueId = (await firstVenue(sql, t))!;
    const r = (await getVenueRules(sql, t, venueId))!;
    const next = { ...r };
    if (key === "booking_window_days") next.bookingHorizonDays = value as number;
    if (key === "min_notice_minutes") next.minNoticeMinutes = value as number;
    if (key === "max_party_online") next.maxPartyOnline = value as number;
    if (key === "cancel_cutoff_hours") next.cancelCutoffHours = value as number;
    if (key === "cancellation_policy") next.cancellationPolicy = value as string;
    if (key === "phone") next.phone = value as string;
    err = await saveVenueRules(sql, t, venueId, next);
  } else if (def.pillar === "ordering") {
    const o = await getOrderingSettings(sql, t.orgId);
    if (key === "paused" || key === "sold_out") {
      await setKitchenState(sql, t, {
        pausedUntil: key === "paused" ? (value ? new Date(value as string) : null) : o.pausedUntil,
        soldOut: key === "sold_out" ? (value as string[]) : o.soldOut,
      });
    } else {
      err = await saveOrderingSettings(sql, t, {
        ...o,
        pickupEnabled: key === "pickup_enabled" ? (value as boolean) : o.pickupEnabled,
        cateringEnabled: key === "catering_enabled" ? (value as boolean) : o.cateringEnabled,
        taxBps: key === "tax_percent" ? Math.round((value as number) * 100) : o.taxBps,
        leadMinutes: key === "prep_minutes" ? (value as number) : o.leadMinutes,
        cateringLeadHours: key === "catering_notice_hours" ? (value as number) : o.cateringLeadHours,
        cateringMinCents: key === "catering_minimum" ? (value as number) : o.cateringMinCents,
      });
    }
  } else if (def.pillar === "website") {
    const site = (await publishedContent(sql, t))!;
    const c: SiteContent = structuredClone(site.content);
    const v = value as string;
    if (key === "announcement") c.announcement = v;
    if (key === "hero_headline") c.hero.headline = v;
    if (key === "contact_phone") c.contact.phone = v;
    if (key === "contact_email") c.contact.email = v;
    if (key === "map_link") c.contact.mapUrl = v;
    if (key === "instagram_link") c.social.instagram = v;
    const saved = await saveVersion(sql, t, site.siteId, c, `${def.label}: ${formatLever(def, v)}`);
    if (!saved.ok) err = saved.errors.join(" ");
    else await publishVersion(sql, t, site.siteId, saved.versionId);
  } else if (def.pillar === "loyalty") {
    const p = await getProgram(sql, t);
    err = await saveProgram(sql, t, {
      active: key === "active" ? (value as boolean) : p.active,
      visitsRequired: key === "visits_required" ? (value as number) : p.visitsRequired,
      reward: key === "reward" ? (value as string) : p.reward,
    });
  }
  if (err) return { ok: false, error: err };
  await log(sql, t.orgId, t.actor, "lever.changed", def.pillar, def.key, { label: def.label, before, after: value, via });
  return { ok: true, before, after: value };
}

/** A lever's raw value written back as input, for Undo. */
export function rawOf(def: LeverDef, v: LeverValue): string {
  if (v === null) return def.kind === "minutes_from_now" ? "0" : "";
  if (def.kind === "money") return String((v as number) / 100);
  if (def.kind === "items") return (v as string[]).join(",");
  if (def.kind === "minutes_from_now") return String(Math.max(0, Math.round((new Date(v as string).getTime() - Date.now()) / 60_000)));
  return String(v);
}

export interface LeverChange { at: Date; actor: string; via: string; label: string; key: string; pillar: Pillar; before: LeverValue; after: LeverValue }

/** Recent lever changes for a pillar — the "what changed" panel on its screen. */
export async function leverHistory(sql: Sql, t: Tenant, pillar: Pillar, limit = 12): Promise<LeverChange[]> {
  assertCan(t, "view");
  const rows = await sql<{ created_at: Date; actor: string; entity_id: string; detail: { label: string; before: LeverValue; after: LeverValue; via: string } }[]>`
    select created_at, actor, entity_id, detail from change_log
    where org_id = ${t.orgId} and action = 'lever.changed' and entity = ${pillar}
    order by created_at desc limit ${limit}`;
  return rows.map((r) => ({ at: r.created_at, actor: r.actor, via: r.detail.via, label: r.detail.label, key: r.entity_id, pillar, before: r.detail.before, after: r.detail.after }));
}

/**
 * Run a change made some other way (a settings form, the website editor)
 * and record every lever it moved, so the history is complete whichever
 * way a setting was changed.
 */
export async function withLeverDiff<T>(sql: Sql, t: Tenant, pillar: Pillar, via: string, fn: () => Promise<T>): Promise<T> {
  const read = () => readLevers(sql, t, pillar).catch(() => [] as { def: LeverDef; value: LeverValue }[]);
  const before = new Map((await read()).map((l) => [l.def.key, l.value]));
  const out = await fn();
  for (const { def, value } of await read()) {
    if (!before.has(def.key)) continue;
    const was = before.get(def.key) ?? null;
    if (JSON.stringify(was) === JSON.stringify(value)) continue;
    await log(sql, t.orgId, t.actor, "lever.changed", def.pillar, def.key, { label: def.label, before: was, after: value, via });
  }
  return out;
}
