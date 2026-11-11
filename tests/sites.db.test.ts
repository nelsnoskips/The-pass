import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import demo from "@/lib/sites/demo-content.json";
import { getPublishedSite, listVersions, publishVersion, saveVersion } from "@/lib/sites/repo";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("site engine against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  const slug = `site-${randomUUID().slice(0, 8)}`;
  let orgId = "", siteId = "", otherOrg = "";
  let owner: Tenant, host: Tenant, stranger: Tenant;

  beforeAll(async () => {
    const mk = async (name: string) => {
      const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values (${name}, ${`${name}-${randomUUID().slice(0, 8)}`}) returning id`;
      return o.id;
    };
    orgId = await mk("sitea");
    otherOrg = await mk("siteb");
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug) values (${orgId}, 'Main', 'main') returning id`;
    const [s] = await sql<{ id: string }[]>`insert into sites (org_id, venue_id, slug) values (${orgId}, ${v.id}, ${slug}) returning id`;
    siteId = s.id;
    owner = { orgId, actor: "owner@a", role: "owner", venueIds: null };
    host = { orgId, actor: "host@a", role: "host", venueIds: null };
    stranger = { orgId: otherOrg, actor: "owner@b", role: "owner", venueIds: null };
  });

  afterAll(async () => {
    await sql`delete from orgs where id in (${orgId}, ${otherOrg})`;
    await sql.end();
  });

  it("serves nothing until a version is published", async () => {
    expect(await getPublishedSite(sql, slug)).toBeNull();
    const saved = await saveVersion(sql, owner, siteId, demo, "first");
    expect(saved.ok).toBe(true);
    expect(await getPublishedSite(sql, slug)).toBeNull();
  });

  it("publishes, keeps drafts private, and rolls back by re-pointing", async () => {
    const [v1] = await listVersions(sql, owner, siteId);
    expect(await publishVersion(sql, owner, siteId, v1.id)).toBe(true);
    expect((await getPublishedSite(sql, slug))?.content.brand.name).toBe("Santorini by Georgios");

    const edited = structuredClone(demo);
    edited.announcement = "Closed Thanksgiving Day.";
    const v2 = await saveVersion(sql, owner, siteId, edited, "holiday notice");
    if (!v2.ok) throw new Error("save");
    // Saved, not live.
    expect((await getPublishedSite(sql, slug))?.content.announcement).toBe("");
    await publishVersion(sql, owner, siteId, v2.versionId);
    expect((await getPublishedSite(sql, slug))?.content.announcement).toBe("Closed Thanksgiving Day.");
    // Rollback.
    await publishVersion(sql, owner, siteId, v1.id);
    expect((await getPublishedSite(sql, slug))?.content.announcement).toBe("");
    const versions = await listVersions(sql, owner, siteId);
    expect(versions.map((v) => v.live)).toEqual([false, true]);
  });

  it("refuses invalid content with the reasons, and saves nothing", async () => {
    const before = (await listVersions(sql, owner, siteId)).length;
    const bad = structuredClone(demo);
    bad.theme.ink = "navy";
    const r = await saveVersion(sql, owner, siteId, bad);
    expect(r).toEqual({ ok: false, errors: ["theme.ink must be a hex colour like #1a2b3c"] });
    expect((await listVersions(sql, owner, siteId)).length).toBe(before);
  });

  it("only managers edit, and never across restaurants", async () => {
    await expect(saveVersion(sql, host, siteId, demo)).rejects.toBeInstanceOf(Forbidden);
    expect(await saveVersion(sql, stranger, siteId, demo)).toEqual({ ok: false, errors: ["Site not found."] });
    const [v] = await listVersions(sql, owner, siteId);
    expect(await publishVersion(sql, stranger, siteId, v.id)).toBe(false);
    expect(await listVersions(sql, stranger, siteId)).toEqual([]);
  });
});
