import type { Sql } from "postgres";
import { isIncluded, planRefusal } from "../billing/entitlements";
import { getOrderingSettings } from "../ordering";
import { assertCan, resolveTenant, type Tenant } from "../platform/tenant";
import { log } from "../reservations/repo";
import { getPublishedSite, type PublicSite } from "../sites/repo";
import { defaultAppConfig, parseAppConfig, sameConfig, type AppConfig, type AppError, type AppFeatures } from "./config";

/**
 * The app's draft and published config. Guests only ever get the
 * published copy; the draft is read with a Tenant (the builder) or for a
 * signed-in member of the same org (the builder's preview).
 */

interface Row { draft: unknown; published: unknown; published_at: Date | null; updated_by: string; updated_at: Date }

function valid(v: unknown): AppConfig | null {
  if (!v) return null;
  const p = parseAppConfig(v, { adjust: true });
  return p.ok ? p.config : null;
}

async function row(sql: Sql, orgId: string): Promise<Row | null> {
  const [r] = await sql<Row[]>`select draft, published, published_at, updated_by, updated_at from app_configs where org_id = ${orgId}`;
  return r ?? null;
}

async function firstSite(sql: Sql, orgId: string): Promise<PublicSite | null> {
  const [s] = await sql<{ slug: string }[]>`select slug from sites where org_id = ${orgId} and published_version_id is not null order by created_at limit 1`;
  return s ? getPublishedSite(sql, s.slug) : null;
}

export interface AppState {
  draft: AppConfig;
  published: AppConfig | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  /** The draft differs from what guests have. */
  unpublished: boolean;
  site: PublicSite | null;
}

/** The builder's view: the draft (or a first one made from the website) and what's live. */
export async function getAppState(sql: Sql, t: Tenant): Promise<AppState> {
  assertCan(t, "view");
  const [r, site] = await Promise.all([row(sql, t.orgId), firstSite(sql, t.orgId)]);
  const fallback = site ? defaultAppConfig(site.content) : null;
  const draft = valid(r?.draft) ?? fallback ?? defaultAppConfig({ brand: { name: "Our restaurant", tagline: "", cuisine: "", priceRange: "" }, theme: { paper: "#ffffff", ink: "#111111", accent: "#1f3a5f" } } as never);
  const published = valid(r?.published);
  return {
    draft, published, publishedAt: r?.published_at ?? null, updatedAt: r?.updated_at ?? null, updatedBy: r?.updated_by ?? null,
    unpublished: !sameConfig(draft, published), site,
  };
}

export type SaveAppResult = { ok: true; config: AppConfig; notes: string[] } | { ok: false; errors: AppError[] };

/** Save the draft. Never changes what guests see. */
export async function saveAppDraft(sql: Sql, t: Tenant, input: unknown): Promise<SaveAppResult> {
  assertCan(t, "manage_venue");
  const parsed = parseAppConfig(input, { adjust: true });
  if (!parsed.ok) return parsed;
  await sql`
    insert into app_configs (org_id, draft, updated_by) values (${t.orgId}, ${sql.json(parsed.config as never)}, ${t.actor})
    on conflict (org_id) do update set draft = excluded.draft, updated_by = excluded.updated_by, updated_at = now()`;
  await log(sql, t.orgId, t.actor, "app.draft_saved", "app", t.orgId, { name: parsed.config.name, notes: parsed.notes });
  return parsed;
}

/** Make the saved draft what guests get. */
export async function publishApp(sql: Sql, t: Tenant, via = "app builder"): Promise<{ ok: true } | { ok: false; error: string }> {
  assertCan(t, "manage_venue");
  const refused = await planRefusal(sql, t.orgId, "app");
  if (refused) return { ok: false, error: refused };
  const r = await row(sql, t.orgId);
  const draft = valid(r?.draft);
  if (!draft) return { ok: false, error: "Save a draft first." };
  await sql`update app_configs set published = ${sql.json(draft as never)}, published_at = now(), updated_by = ${t.actor}, updated_at = now()
            where org_id = ${t.orgId}`;
  await log(sql, t.orgId, t.actor, "app.published", "app", t.orgId, { name: draft.name, via });
  return { ok: true };
}

/**
 * Change one field in both the draft and the published app (a lever from
 * the assistant): the change goes live without publishing anything else
 * that's waiting in the draft.
 */
export async function patchAndPublish(sql: Sql, t: Tenant, patch: (c: AppConfig) => AppConfig, via: string): Promise<{ ok: true } | { ok: false; error: string }> {
  assertCan(t, "manage_venue");
  const refused = await planRefusal(sql, t.orgId, "app");
  if (refused) return { ok: false, error: refused };
  const state = await getAppState(sql, t);
  const base = state.published ?? state.draft;
  const nextPublished = parseAppConfig(patch(structuredClone(base)));
  if (!nextPublished.ok) return { ok: false, error: nextPublished.errors.map((e) => e.message).join(" ") };
  const nextDraft = parseAppConfig(patch(structuredClone(state.draft)));
  // A draft the change doesn't fit (say, a different background) is left as it was.
  const draft = nextDraft.ok ? nextDraft.config : state.draft;
  await sql`
    insert into app_configs (org_id, draft, published, published_at, updated_by)
    values (${t.orgId}, ${sql.json(draft as never)}, ${sql.json(nextPublished.config as never)}, now(), ${t.actor})
    on conflict (org_id) do update set draft = excluded.draft, published = excluded.published,
      published_at = now(), updated_by = excluded.updated_by, updated_at = now()`;
  await log(sql, t.orgId, t.actor, "app.published", "app", t.orgId, { name: nextPublished.config.name, via });
  return { ok: true };
}

/** The live (published) config, or the draft before anything is published — for lever reads. */
export async function liveAppConfig(sql: Sql, t: Tenant): Promise<AppConfig | null> {
  const s = await getAppState(sql, t);
  return s.site ? s.published ?? s.draft : null;
}

/* ------------------------------------------------------------ guests --- */

/** What the restaurant has on, for which buttons can show. */
export async function appFeatures(sql: Sql, site: PublicSite): Promise<AppFeatures> {
  const [ordering, [loyalty], [venue]] = await Promise.all([
    getOrderingSettings(sql, site.orgId),
    sql<{ active: boolean }[]>`select active from loyalty_programs where org_id = ${site.orgId}`,
    sql<{ phone: string | null; address: string | null }[]>`select phone, address from venues where id = ${site.venueId} and org_id = ${site.orgId}`,
  ]);
  const c = site.content;
  return {
    ordering: ordering.pickupEnabled || ordering.cateringEnabled,
    loyalty: Boolean(loyalty?.active),
    menu: c.menus.some((m) => m.sections.some((s) => s.items.length > 0)),
    hours: c.hours.length > 0 || Boolean(c.contact.address || venue?.address),
    phone: c.contact.phone || venue?.phone || "",
    instagram: c.social.instagram,
    giftCardsOnline: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
  };
}

export interface Viewer { email: string; staff: boolean }

export interface GuestApp {
  site: PublicSite;
  config: AppConfig;
  features: AppFeatures;
  /** Showing the unpublished draft (only to a signed-in member of this restaurant). */
  draft: boolean;
}

/**
 * The app for a site slug. Guests get the published app, or nothing
 * before it's published. `wantDraft` from a signed-in member of the
 * same restaurant shows the draft; from anyone else it's ignored.
 */
export async function loadGuestApp(sql: Sql, slug: string, opts: { wantDraft?: boolean; viewer?: Viewer | null } = {}): Promise<GuestApp | null> {
  const site = await getPublishedSite(sql, slug);
  if (!site) return null;
  // Not in the restaurant's plan: no app for guests (the builder is hidden too).
  if (!(await isIncluded(sql, site.orgId, "app"))) return null;
  const r = await row(sql, site.orgId);
  let config: AppConfig | null = null;
  let draft = false;
  if (opts.wantDraft && opts.viewer && (await canPreview(sql, site.orgId, opts.viewer))) {
    config = valid(r?.draft) ?? defaultAppConfig(site.content);
    draft = true;
  } else {
    config = valid(r?.published);
  }
  if (!config) return null;
  return { site, config, features: await appFeatures(sql, site), draft };
}

/** A signed-in member (or studio staff) of the org that owns the site. */
export async function canPreview(sql: Sql, orgId: string, viewer: Viewer): Promise<boolean> {
  const [org] = await sql<{ slug: string }[]>`select slug from orgs where id = ${orgId}`;
  if (!org) return false;
  const t = await resolveTenant(sql, viewer.email, org.slug, () => viewer.staff);
  return Boolean(t && t.orgId === orgId);
}

/** Whether the restaurant's app is live, for "Open in the app" links. */
export async function appIsLive(sql: Sql, orgId: string): Promise<boolean> {
  if (!(await isIncluded(sql, orgId, "app"))) return false;
  const [r] = await sql`select 1 from app_configs where org_id = ${orgId} and published is not null`;
  return Boolean(r);
}

export interface RewardsProgress {
  firstName: string;
  visits: number;
  visitsRequired: number;
  /** Visits until the next reward. */
  toNext: number;
  reward: string;
  /** A reward earned and not yet handed over. */
  waiting: string | null;
}

/**
 * Loyalty progress for the guest a booking link belongs to. The booking
 * token is the proof: it was texted to that guest. Never looked up by
 * phone number.
 */
export async function rewardsForBooking(sql: Sql, orgId: string, token: string): Promise<RewardsProgress | null> {
  if (!token || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  if (!(await isIncluded(sql, orgId, "loyalty"))) return null;
  const [r] = await sql<{ id: string; name: string; visit_count: number; visits_required: number; reward: string; active: boolean }[]>`
    select g.id, g.name, g.visit_count, p.visits_required, p.reward, p.active
    from reservations r
    join guests g on g.id = r.guest_id and g.org_id = r.org_id
    join loyalty_programs p on p.org_id = r.org_id
    where r.manage_token = ${token} and r.org_id = ${orgId}`;
  if (!r || !r.active) return null;
  const [open] = await sql<{ reward: string }[]>`
    select reward from loyalty_rewards where org_id = ${orgId} and guest_id = ${r.id} and redeemed_at is null order by earned_at limit 1`;
  const into = r.visit_count % r.visits_required;
  return {
    firstName: r.name.split(" ")[0] ?? "", visits: r.visit_count, visitsRequired: r.visits_required,
    toNext: r.visits_required - into, reward: r.reward, waiting: open?.reward ?? null,
  };
}

/** The program as guests may see it: "every 5 visits earns a dessert". */
export async function publicProgram(sql: Sql, orgId: string): Promise<{ visitsRequired: number; reward: string } | null> {
  if (!(await isIncluded(sql, orgId, "loyalty"))) return null;
  const [p] = await sql<{ active: boolean; visits_required: number; reward: string }[]>`
    select active, visits_required, reward from loyalty_programs where org_id = ${orgId}`;
  return p?.active ? { visitsRequired: p.visits_required, reward: p.reward } : null;
}
