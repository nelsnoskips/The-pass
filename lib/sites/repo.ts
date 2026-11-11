import type { Sql } from "postgres";
import { assertCan, type Tenant } from "../platform/tenant";
import { log } from "../reservations/repo";
import { parseSiteContent, type SiteContent } from "./content";

/**
 * Sites and their versions. Public readers get the published version by
 * slug and nothing else; everything that writes, or reads a draft, needs
 * a Tenant.
 */

export interface PublicSite {
  id: string;
  orgId: string;
  venueId: string;
  slug: string;
  theme: string;
  timezone: string;
  maxPartyOnline: number;
  bookingHorizonDays: number;
  content: SiteContent;
}

export async function getPublishedSite(sql: Sql, slug: string): Promise<PublicSite | null> {
  const [row] = await sql<{
    id: string; org_id: string; venue_id: string; slug: string; theme: string;
    timezone: string; max_party_online: number; booking_horizon_days: number; content: unknown;
  }[]>`
    select s.id, s.org_id, s.venue_id, s.slug, s.theme,
           v.timezone, v.max_party_online, v.booking_horizon_days, sv.content
    from sites s
    join venues v on v.id = s.venue_id
    join site_versions sv on sv.id = s.published_version_id
    where s.slug = ${slug}`;
  if (!row) return null;
  // Stored content was validated on the way in; parse again so a theme
  // can never be handed a shape it doesn't expect.
  const parsed = parseSiteContent(row.content);
  if (!parsed.ok) return null;
  return {
    id: row.id, orgId: row.org_id, venueId: row.venue_id, slug: row.slug, theme: row.theme,
    timezone: row.timezone, maxPartyOnline: row.max_party_online,
    bookingHorizonDays: row.booking_horizon_days, content: parsed.content,
  };
}

export type SaveResult = { ok: true; versionId: string } | { ok: false; errors: string[] };

/** Save a new draft version. Never changes what is live. */
export async function saveVersion(
  sql: Sql, tenant: Tenant, siteId: string, content: unknown, note: string | null = null,
): Promise<SaveResult> {
  assertCan(tenant, "manage_venue");
  const parsed = parseSiteContent(content);
  if (!parsed.ok) return parsed;
  const [site] = await sql`select 1 from sites where id = ${siteId} and org_id = ${tenant.orgId}`;
  if (!site) return { ok: false, errors: ["Site not found."] };
  const [v] = await sql<{ id: string }[]>`
    insert into site_versions (org_id, site_id, content, note, created_by)
    values (${tenant.orgId}, ${siteId}, ${sql.json(parsed.content as never)}, ${note}, ${tenant.actor})
    returning id`;
  await log(sql, tenant.orgId, tenant.actor, "site.version_saved", "site", siteId, { versionId: v.id, note });
  return { ok: true, versionId: v.id };
}

/** Make a version live. Publishing an older version is the rollback. */
export async function publishVersion(sql: Sql, tenant: Tenant, siteId: string, versionId: string): Promise<boolean> {
  assertCan(tenant, "manage_venue");
  const rows = await sql`
    update sites set published_version_id = ${versionId}
    where id = ${siteId} and org_id = ${tenant.orgId}
      and exists (select 1 from site_versions
                  where id = ${versionId} and site_id = ${siteId} and org_id = ${tenant.orgId})
    returning id`;
  if (rows.length) await log(sql, tenant.orgId, tenant.actor, "site.published", "site", siteId, { versionId });
  return rows.length > 0;
}

export async function listVersions(sql: Sql, tenant: Tenant, siteId: string) {
  assertCan(tenant, "view");
  return sql<{ id: string; note: string | null; created_by: string; created_at: Date; live: boolean }[]>`
    select sv.id, sv.note, sv.created_by, sv.created_at, (s.published_version_id = sv.id) as live
    from site_versions sv join sites s on s.id = sv.site_id
    where sv.site_id = ${siteId} and sv.org_id = ${tenant.orgId}
    order by sv.created_at desc limit 50`;
}

export interface OrgSite {
  id: string;
  slug: string;
  publishedVersionId: string | null;
}

export async function siteForOrg(sql: Sql, tenant: Tenant): Promise<OrgSite | null> {
  assertCan(tenant, "view");
  const [s] = await sql<{ id: string; slug: string; published_version_id: string | null }[]>`
    select id, slug, published_version_id from sites where org_id = ${tenant.orgId} order by created_at limit 1`;
  return s ? { id: s.id, slug: s.slug, publishedVersionId: s.published_version_id } : null;
}

/** Any version of the org's site — drafts included — for the editor and preview. */
export async function getVersion(sql: Sql, tenant: Tenant, versionId: string): Promise<SiteContent | null> {
  assertCan(tenant, "view");
  if (!/^[0-9a-f-]{36}$/i.test(versionId)) return null;
  const [v] = await sql<{ content: unknown }[]>`
    select content from site_versions where id = ${versionId} and org_id = ${tenant.orgId}`;
  if (!v) return null;
  const parsed = parseSiteContent(v.content);
  return parsed.ok ? parsed.content : null;
}
