import { isIncluded } from "../billing/entitlements";
import { createHash } from "node:crypto";
import type { Sql } from "postgres";
import { recordCheck } from "../guests/visits";
import { menuNames, setLever } from "../levers";
import { getOrderingSettings } from "../ordering";
import { assertCan, type Tenant } from "../platform/tenant";
import { log } from "../reservations/repo";
import type { Menu, MenuItem, MenuSection, SiteContent } from "../sites/content";
import { getVersion, listVersions, saveVersion, siteForOrg } from "../sites/repo";
import { integrationsKeyConfigured, open, seal } from "./secrets";

/**
 * Toast, through Standard API access: read-only credentials a restaurant
 * creates itself in Toast Web (Integrations → Toast API access → Manage
 * credentials) and pastes into Settings. The Pass never writes to Toast —
 * standard access only allows GET requests.
 *
 * What it reads (every endpoint below is in the standard access scopes,
 * https://doc.toasttab.com/doc/devguide/devApiAccessScopes.html):
 *   restaurants:read  GET /restaurants/v1/restaurants/{guid}   name, time zone
 *   orders:read       GET /orders/v2/ordersBulk                closed checks → visits and spend
 *   guest.pi:read     (the Customer object on a check)         phone / email to match a guest
 *   menus:read        GET /menus/v2/menus                      menu → website draft (v2 only:
 *                                                              standard access refuses v3)
 *   stock:read        GET /stock/v1/inventory                  86'd dishes → the sold-out lever
 *
 * Toast only sends guest details on takeout and delivery orders, never on
 * dine-in checks ("Guest data is not provided for in-store orders",
 * https://doc.toasttab.com/doc/devguide/devApiAccessFAQs.html). Those
 * checks are still stored — unmatched — so sales totals are complete.
 *
 *   TOAST_API_HOST  (optional; default https://ws-api.toasttab.com,
 *                    the sandbox is https://ws-sandbox-api.eng.toasttab.com)
 *   INTEGRATIONS_KEY seals the restaurant's client ID and secret at rest.
 */

type Fetch = typeof fetch;

export const TOAST_ACTOR = "agent:toast-sync";
/** Toast's limit on a historical ordersBulk window is one month. */
const FIRST_SYNC_DAYS = 30;
/** Re-read a little before the last cursor: a check closed as we read can land late. */
const OVERLAP_MS = 15 * 60_000;
const PAGE_SIZE = 100; // the maximum ordersBulk allows
const MAX_PAGES = 200;

const host = () => (process.env.TOAST_API_HOST?.trim() || "https://ws-api.toasttab.com").replace(/\/+$/, "");

export function toastConfigured(): boolean {
  return integrationsKeyConfigured();
}

export interface ToastCredentials {
  clientId: string;
  clientSecret: string;
  restaurantGuid: string;
}

export interface ToastSettings {
  restaurantGuid: string;
  restaurantName: string;
  timezone: string | null;
  /** Orders are read up to here; the next sync starts just before it. */
  syncedThrough?: string;
  /** Site item ids Toast marked 86'd at the last sync, so it only lifts its own. */
  eightySixed?: string[];
}

/** A plain error safe to show an owner: never a credential, never Toast's raw body. */
export class ToastError extends Error {
  constructor(message: string, readonly field?: "clientId" | "clientSecret" | "restaurantGuid") {
    super(message);
    this.name = "ToastError";
  }
}

/* ------------------------------------------------------------ auth -- */

// One token per API client, per process. Toast says how long it lasts
// (expiresIn, seconds); we renew a minute early.
// https://doc.toasttab.com/doc/devguide/authentication.html
const tokens = new Map<string, { token: string; expiresAt: number }>();

export function clearToastTokens(): void {
  tokens.clear();
}

/** Keyed on the secret too, so a client ID alone never reuses someone's token. */
const tokenKey = (clientId: string, clientSecret: string) =>
  createHash("sha256").update(`${host()}|${clientId}|${clientSecret}`).digest("base64url");

async function login(f: Fetch, clientId: string, clientSecret: string, now: number): Promise<string> {
  const key = tokenKey(clientId, clientSecret);
  const hit = tokens.get(key);
  if (hit && hit.expiresAt - 60_000 > now) return hit.token;
  let res: Response;
  try {
    res = await f(`${host()}/authentication/v1/authentication/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret, userAccessType: "TOAST_MACHINE_CLIENT" }),
    });
  } catch {
    throw new ToastError("Couldn't reach Toast. Try again in a minute.");
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new ToastError("Toast didn't accept that Client ID and secret. Copy them again from Toast Web → Integrations → Manage credentials.", "clientSecret");
  }
  if (!res.ok) throw new ToastError(`Toast sign-in failed (${res.status}). Try again in a minute.`);
  const body = (await res.json().catch(() => ({}))) as { token?: { accessToken?: string; expiresIn?: number } };
  const token = body.token?.accessToken;
  if (!token) throw new ToastError("Toast sign-in returned no token. Try again in a minute.");
  const life = Number(body.token?.expiresIn);
  tokens.set(key, { token, expiresAt: now + (Number.isFinite(life) && life > 0 ? life : 3600) * 1000 });
  return token;
}

interface Session { f: Fetch; creds: ToastCredentials; now: number }

/** A GET against one location, with one retry on a stale token. */
async function get<T>(s: Session, path: string, what: string): Promise<{ body: T; res: Response }> {
  for (let attempt = 0; ; attempt++) {
    const token = await login(s.f, s.creds.clientId, s.creds.clientSecret, s.now);
    let res: Response;
    try {
      res = await s.f(`${host()}${path}`, {
        headers: { Authorization: `Bearer ${token}`, "Toast-Restaurant-External-ID": s.creds.restaurantGuid },
      });
    } catch {
      throw new ToastError(`Couldn't reach Toast for ${what}.`);
    }
    if (res.status === 401 && attempt === 0) {
      tokens.delete(tokenKey(s.creds.clientId, s.creds.clientSecret));
      continue;
    }
    if (res.status === 403) {
      throw new ToastError(`Toast refused access to ${what}. Check that these credentials include this location in Toast Web → Integrations → Manage credentials.`, "restaurantGuid");
    }
    if (res.status === 404) throw new ToastError(`Toast has no ${what} for that location GUID.`, "restaurantGuid");
    if (res.status === 429) throw new ToastError("Toast asked us to slow down. The next sync will pick up where this one stopped.");
    if (!res.ok) throw new ToastError(`Toast ${what} failed (${res.status}).`);
    return { body: (await res.json().catch(() => null)) as T, res };
  }
}

/* --------------------------------------------------------- connect -- */

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanCreds(input: ToastCredentials): ToastCredentials {
  const clientId = String(input.clientId ?? "").trim();
  const clientSecret = String(input.clientSecret ?? "").trim();
  const restaurantGuid = String(input.restaurantGuid ?? "").trim().toLowerCase();
  if (!clientId || clientId.length > 200) throw new ToastError("Paste the Client ID from Toast.", "clientId");
  if (!clientSecret || clientSecret.length > 500) throw new ToastError("Paste the Client secret from Toast.", "clientSecret");
  if (!GUID.test(restaurantGuid)) throw new ToastError("The Location GUID looks like 8-4-4-4-12 letters and numbers, e.g. 1a2b3c4d-…", "restaurantGuid");
  return { clientId, clientSecret, restaurantGuid };
}

interface ToastRestaurant {
  guid?: string;
  general?: { name?: string; locationName?: string; timeZone?: string };
}

/**
 * Check the credentials work for this location (sign in, read the
 * restaurant), then store them sealed. Returns the restaurant's name.
 * https://doc.toasttab.com/openapi/restaurants/operation/restaurantsRestaurantGuidGet/
 */
export async function connectToast(sql: Sql, orgId: string, input: ToastCredentials, actor: string, f: Fetch = fetch, now = new Date()): Promise<string> {
  if (!toastConfigured()) throw new ToastError("Connecting Toast isn't switched on for The Pass yet. The Pass team needs to set the encryption key.");
  const creds = cleanCreds(input);
  const { body } = await get<ToastRestaurant>({ f, creds, now: now.getTime() },
    `/restaurants/v1/restaurants/${creds.restaurantGuid}`, "this location");
  const g = body?.general ?? {};
  const name = [g.name?.trim(), g.locationName?.trim() && g.locationName.trim() !== g.name?.trim() ? g.locationName.trim() : null]
    .filter(Boolean).join(" — ") || "Toast location";
  // One Toast location belongs to one restaurant here: a second org
  // claiming it would get the first one's guests' checks.
  const [taken] = await sql`
    select 1 from org_integrations where provider = 'toast' and status = 'connected'
      and settings->>'restaurantGuid' = ${creds.restaurantGuid} and org_id <> ${orgId}`;
  if (taken) throw new ToastError("That Toast location is already connected to another restaurant on The Pass.", "restaurantGuid");
  const settings: ToastSettings = { restaurantGuid: creds.restaurantGuid, restaurantName: name, timezone: g.timeZone?.trim() || null };
  await sql`
    insert into org_integrations (org_id, provider, status, account_label, settings, secret, updated_by)
    values (${orgId}, 'toast', 'connected', ${name}, ${sql.json(settings as never)},
            ${seal(JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret }))}, ${actor})
    on conflict (org_id, provider) do update set status = 'connected', account_label = excluded.account_label,
      settings = excluded.settings, secret = excluded.secret, updated_by = excluded.updated_by, updated_at = now(), error = null`;
  await log(sql, orgId, actor, "integration.connected", "integration", "toast", { restaurant: name, location: creds.restaurantGuid });
  return name;
}

/** Disconnect: the sealed credentials are deleted, not just hidden. */
export async function disconnectToast(sql: Sql, t: Tenant): Promise<void> {
  assertCan(t, "manage_venue");
  await sql`update org_integrations set status = 'disconnected', secret = null, error = null, updated_by = ${t.actor}, updated_at = now()
            where org_id = ${t.orgId} and provider = 'toast'`;
  await log(sql, t.orgId, t.actor, "integration.disconnected", "integration", "toast");
}

/** The owner-facing connect: permission first, then connectToast. */
export async function connectToastAs(sql: Sql, t: Tenant, input: ToastCredentials, f: Fetch = fetch): Promise<string> {
  assertCan(t, "manage_venue");
  return connectToast(sql, t.orgId, input, t.actor, f);
}

async function loadConnection(sql: Sql, orgId: string): Promise<{ creds: ToastCredentials; settings: ToastSettings }> {
  const [row] = await sql<{ secret: string | null; settings: ToastSettings; status: string }[]>`
    select secret, settings, status from org_integrations where org_id = ${orgId} and provider = 'toast'`;
  if (!row || row.status !== "connected" || !row.secret) throw new ToastError("Toast isn't connected.");
  const { clientId, clientSecret } = JSON.parse(open(row.secret)) as { clientId: string; clientSecret: string };
  return { creds: { clientId, clientSecret, restaurantGuid: row.settings.restaurantGuid }, settings: row.settings };
}

/* ------------------------------------------------------------ sync -- */

interface ToastCustomer { firstName?: string; lastName?: string; phone?: string; phoneCountryCode?: string; email?: string }
interface ToastCheck {
  guid?: string; voided?: boolean; deleted?: boolean; closedDate?: string | null; paymentStatus?: string;
  amount?: number | null; totalAmount?: number | null; customer?: ToastCustomer | null;
}
interface ToastOrder { guid?: string; voided?: boolean; deleted?: boolean; closedDate?: string | null; checks?: ToastCheck[] }

/** Toast writes offsets as -0800 on some fields; make them parseable everywhere. */
function toastDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function phoneOf(c: ToastCustomer): string | null {
  const p = c.phone?.trim();
  if (!p) return null;
  const cc = c.phoneCountryCode?.replace(/\D/g, "");
  if (!p.startsWith("+") && cc && cc !== "1") return `+${cc}${p.replace(/\D/g, "")}`;
  return p;
}

/** Dollars (Toast rounds currency to two places) → integer cents. */
function cents(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/**
 * Every order modified in [start, end), a page of 100 at a time. Toast
 * pages with `page`/`pageSize` and a Link header with rel="next".
 * https://doc.toasttab.com/doc/devguide/apiOrdersGetDetailedInfoAboutMultipleOrders.html
 * https://doc.toasttab.com/openapi/orders/operation/ordersBulkGet/
 */
async function ordersBetween(s: Session, start: Date, end: Date): Promise<ToastOrder[]> {
  const out: ToastOrder[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const q = new URLSearchParams({ startDate: start.toISOString(), endDate: end.toISOString(), pageSize: String(PAGE_SIZE), page: String(page) });
    const { body, res } = await get<ToastOrder[]>(s, `/orders/v2/ordersBulk?${q}`, "orders");
    const list = Array.isArray(body) ? body : [];
    out.push(...list);
    const link = res.headers.get("link");
    const more = link ? /rel="?next"?/i.test(link) : list.length === PAGE_SIZE;
    if (!more || list.length === 0) break;
  }
  return out;
}

/** Every closed, non-voided check → recordCheck. Returns checks newly recorded. */
async function recordOrders(sql: Sql, orgId: string, orders: ToastOrder[]): Promise<{ recorded: number; matched: number }> {
  let recorded = 0, matched = 0;
  for (const o of orders) {
    if (!o || o.voided || o.deleted) continue;
    for (const c of o.checks ?? []) {
      if (!c?.guid || c.voided || c.deleted) continue;
      const closedAt = toastDate(c.closedDate) ?? (c.paymentStatus === "CLOSED" ? toastDate(o.closedDate) : null);
      if (!closedAt) continue; // still open: it'll come back modified when it closes
      const amount = cents(c.totalAmount) ?? cents(c.amount);
      if (amount === null) continue;
      const cust = c.customer ?? null;
      const r = await recordCheck(sql, {
        orgId, source: "toast", externalId: c.guid, amountCents: amount, closedAt,
        phone: cust ? phoneOf(cust) : null, email: cust?.email?.trim() || null,
      });
      if (r.recorded) {
        recorded++;
        if (r.guestId) matched++;
      }
    }
  }
  return { recorded, matched };
}

/**
 * Toast's 86 list → the ordering sold_out lever, for dishes imported from
 * Toast (their site ids carry the Toast guid). Lifts only what Toast
 * itself 86'd last time, so a dish a manager 86'd here stays 86'd.
 * https://doc.toasttab.com/doc/devguide/apiUsingTheStockApi.html
 */
async function syncStock(sql: Sql, orgId: string, s: Session, previous: string[]): Promise<string[] | null> {
  // No online ordering on this plan: nothing to mirror the 86 list to.
  if (!(await isIncluded(sql, orgId, "ordering"))) return null;
  const { body } = await get<{ guid?: string; status?: string }[]>(s, "/stock/v1/inventory?status=OUT_OF_STOCK", "stock");
  const out = new Set((Array.isArray(body) ? body : []).filter((i) => i?.status === "OUT_OF_STOCK" && i.guid).map((i) => itemIdFor(i.guid!)));
  const system: Tenant = { orgId, actor: TOAST_ACTOR, role: "manager", venueIds: null };
  const names = await menuNames(sql, system);
  if (!names.size) return previous.length ? [] : null;
  // Every site id for an out-of-stock Toast item (it may sit on two menus).
  const now86 = [...names.keys()].filter((id) => out.has(baseId(id)));
  const lifted = new Set(previous.filter((id) => !now86.includes(id)));
  const current = (await getOrderingSettings(sql, orgId)).soldOut;
  const next = [...new Set([...current.filter((id) => !lifted.has(id)), ...now86])].filter((id) => names.has(id));
  if (JSON.stringify([...current].sort()) !== JSON.stringify([...next].sort())) {
    const r = await setLever(sql, system, "ordering", "sold_out", next.join(","), "Toast");
    if (!r.ok) throw new ToastError(`Couldn't mirror Toast's 86 list: ${r.error}`);
  }
  return now86;
}

/**
 * Pull closed checks since the last sync (first time: the last 30 days)
 * and Toast's 86 list. Recorded in toast_syncs; a failure is written on
 * the connection so Settings shows "Needs attention".
 */
export async function syncToast(sql: Sql, orgId: string, f: Fetch = fetch, now = new Date()): Promise<{ ok: boolean; rows: number; matched?: number; error?: string }> {
  const [run] = await sql<{ id: number }[]>`insert into toast_syncs (org_id, status) values (${orgId}, 'ok') returning id`;
  try {
    const { creds, settings } = await loadConnection(sql, orgId);
    const s: Session = { f, creds, now: now.getTime() };
    const floor = now.getTime() - FIRST_SYNC_DAYS * 86_400_000;
    const last = settings.syncedThrough ? new Date(settings.syncedThrough).getTime() - OVERLAP_MS : floor;
    const start = new Date(Math.max(floor, Number.isFinite(last) ? last : floor));
    const { recorded, matched } = await recordOrders(sql, orgId, await ordersBetween(s, start, now));
    const eightySixed = await syncStock(sql, orgId, s, settings.eightySixed ?? []);
    const patch: Partial<ToastSettings> = { syncedThrough: now.toISOString(), ...(eightySixed ? { eightySixed } : {}) };
    await sql`update org_integrations set settings = settings || ${sql.json(patch as never)}, error = null, updated_at = now()
              where org_id = ${orgId} and provider = 'toast'`;
    await sql`update toast_syncs set rows = ${recorded}, matched = ${matched}, finished_at = now() where id = ${run.id}`;
    return { ok: true, rows: recorded, matched };
  } catch (err) {
    // Only our own messages are stored or shown; anything else is generic,
    // so nothing from a credential or a raw response can leak.
    const error = err instanceof ToastError ? err.message : "Toast sync failed. We'll try again next hour.";
    if (!(err instanceof ToastError)) console.error("toast sync", orgId, err instanceof Error ? err.name : "error");
    await sql`update toast_syncs set status = 'failed', error = ${error}, finished_at = now() where id = ${run.id}`;
    await sql`update org_integrations set error = ${error}, updated_at = now() where org_id = ${orgId} and provider = 'toast'`;
    return { ok: false, rows: 0, error };
  }
}

/** Sync now, from Settings. */
export async function syncToastAs(sql: Sql, t: Tenant, f: Fetch = fetch, now = new Date()) {
  assertCan(t, "manage_venue");
  return syncToast(sql, t.orgId, f, now);
}

export interface ToastStatus {
  connected: boolean;
  restaurantName: string | null;
  error: string | null;
  lastSync: { at: Date; ok: boolean; rows: number; matched: number; error: string | null } | null;
}

export async function toastStatus(sql: Sql, t: Tenant): Promise<ToastStatus> {
  assertCan(t, "view");
  const [row] = await sql<{ status: string; account_label: string | null; error: string | null }[]>`
    select status, account_label, error from org_integrations where org_id = ${t.orgId} and provider = 'toast'`;
  const [s] = await sql<{ started_at: Date; finished_at: Date | null; status: string; rows: number; matched: number; error: string | null }[]>`
    select started_at, finished_at, status, rows, matched, error from toast_syncs where org_id = ${t.orgId} order by id desc limit 1`;
  return {
    connected: row?.status === "connected",
    restaurantName: row?.account_label ?? null,
    error: row?.error ?? null,
    lastSync: s ? { at: s.finished_at ?? s.started_at, ok: s.status === "ok", rows: s.rows, matched: s.matched, error: s.error } : null,
  };
}

/* ------------------------------------------------------ menu import -- */

interface ToastMenuItem { guid?: string; name?: string; description?: string | null; price?: number | null }
interface ToastMenuGroup { guid?: string; name?: string; description?: string | null; menuItems?: ToastMenuItem[]; menuGroups?: ToastMenuGroup[] }
interface ToastMenu { guid?: string; name?: string; description?: string | null; menuGroups?: ToastMenuGroup[] }

/** A Toast guid as a site id: `t-<guid>`, which the site's id rules accept. */
export function itemIdFor(guid: string): string {
  return `t-${guid.toLowerCase().replace(/[^a-z0-9_-]/g, "")}`.slice(0, 60);
}
/** `t-<guid>-2` (the same dish on a second menu) → `t-<guid>`. */
function baseId(id: string): string {
  return /^t-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.exec(id)?.[0] ?? id;
}

const cut = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

/** Toast menus → the site's menus. Pure, so it can be tested on its own. */
export function mapToastMenus(menus: ToastMenu[]): { menus: Menu[]; items: number; skipped: number } {
  const itemIds = new Set<string>();
  let items = 0, skipped = 0;
  const out: Menu[] = [];
  for (const m of menus) {
    if (!m?.guid || !cut(m.name, 120)) continue;
    if (out.length >= 8) { skipped += countItems(m.menuGroups ?? []); continue; }
    const sections: MenuSection[] = [];
    const sectionIds = new Set<string>();
    // Nested groups become sections of their own, named after the group.
    const walk = (groups: ToastMenuGroup[], depth: number) => {
      for (const g of groups ?? []) {
        if (!g) continue;
        const list: MenuItem[] = [];
        for (const it of g.menuItems ?? []) {
          if (!it?.guid || !cut(it.name, 120)) { skipped++; continue; }
          if (list.length >= 80) { skipped++; continue; }
          let id = itemIdFor(it.guid);
          for (let n = 2; itemIds.has(id); n++) id = `${itemIdFor(it.guid)}-${n}`;
          itemIds.add(id);
          list.push({ id, name: cut(it.name, 120), description: cut(it.description, 400), priceCents: cents(it.price), tags: [] });
        }
        const sid = g.guid ? itemIdFor(g.guid) : "";
        if (list.length && sid && cut(g.name, 120) && !sectionIds.has(sid)) {
          if (sections.length < 20) {
            sectionIds.add(sid);
            sections.push({ id: sid, name: cut(g.name, 120), note: cut(g.description, 300), items: list });
            items += list.length;
          } else skipped += list.length;
        } else skipped += list.length;
        if (depth < 4) walk(g.menuGroups ?? [], depth + 1);
      }
    };
    walk(m.menuGroups ?? [], 0);
    if (sections.length) out.push({ id: itemIdFor(m.guid), name: cut(m.name, 120), sections });
  }
  return { menus: out, items, skipped };
}

function countItems(groups: ToastMenuGroup[]): number {
  return (groups ?? []).reduce((n, g) => n + (g?.menuItems?.length ?? 0) + countItems(g?.menuGroups ?? []), 0);
}

export type ImportResult =
  | { ok: true; versionId: string; menus: number; items: number; skipped: number }
  | { ok: false; error: string };

/**
 * Toast's menu as a website draft: the site's newest version with its
 * menus replaced by Toast's. Never published here — the owner reviews it
 * on the Website page. Dish ids carry Toast guids so 86 sync lines up.
 * https://doc.toasttab.com/openapi/menus/operation/menusGet/
 */
export async function importToastMenu(sql: Sql, t: Tenant, f: Fetch = fetch, now = new Date()): Promise<ImportResult> {
  assertCan(t, "manage_venue");
  const site = await siteForOrg(sql, t);
  if (!site) return { ok: false, error: "Set up your website first; then the Toast menu can be imported into it." };
  const newest = (await listVersions(sql, t, site.id))[0];
  const base: SiteContent | null = newest ? await getVersion(sql, t, newest.id) : null;
  if (!base) return { ok: false, error: "Your website has no saved version to import into yet." };
  let toast: { menus?: ToastMenu[] } | null;
  try {
    const { creds } = await loadConnection(sql, t.orgId);
    toast = (await get<{ menus?: ToastMenu[] }>({ f, creds, now: now.getTime() }, "/menus/v2/menus", "menus")).body;
  } catch (err) {
    if (err instanceof ToastError) return { ok: false, error: err.message };
    throw err;
  }
  const mapped = mapToastMenus(Array.isArray(toast?.menus) ? toast!.menus! : []);
  if (!mapped.items) return { ok: false, error: "Toast didn't return any dishes with names to import." };
  const note = `Menu imported from Toast: ${mapped.items} dish${mapped.items === 1 ? "" : "es"}${mapped.skipped ? `, ${mapped.skipped} left out` : ""}`;
  const saved = await saveVersion(sql, t, site.id, { ...base, menus: mapped.menus }, note);
  if (!saved.ok) return { ok: false, error: `The imported menu didn't fit the website: ${saved.errors.slice(0, 3).join("; ")}.` };
  await log(sql, t.orgId, t.actor, "toast.menu_imported", "site", site.id,
    { versionId: saved.versionId, menus: mapped.menus.length, items: mapped.items, skipped: mapped.skipped });
  return { ok: true, versionId: saved.versionId, menus: mapped.menus.length, items: mapped.items, skipped: mapped.skipped };
}
