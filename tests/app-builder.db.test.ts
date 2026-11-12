import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import demo from "@/lib/sites/demo-content.json";
import { appTiles, defaultAppConfig, type AppConfig } from "@/lib/app/config";
import { pushSubscriberCount, savePushSubscription, removePushSubscription } from "@/lib/app/push";
import {
  appFeatures, getAppState, loadGuestApp, publishApp, publicProgram, rewardsForBooking, saveAppDraft,
} from "@/lib/app/repo";
import { applyChange, proposeChange } from "@/lib/assistant";
import { readLevers, setLever } from "@/lib/levers";
import { saveOrderingSettings, getOrderingSettings } from "@/lib/ordering";
import { publishVersion, saveVersion } from "@/lib/sites/repo";
import type { SiteContent } from "@/lib/sites/content";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("restaurant app against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  const tag = randomUUID().slice(0, 8);
  const slugA = `appa-${tag}`, slugB = `appb-${tag}`;
  let orgA = "", orgB = "";
  let ownerA: Tenant, hostA: Tenant, ownerB: Tenant;
  const VAPID = "B".repeat(87);
  const sub = (n: string) => ({ subscription: { endpoint: `https://push.example.com/send/${tag}-${n}`, keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } } });

  async function mkOrg(name: string, siteSlug: string, owner: string) {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values (${name}, ${`${name}-${tag}`}) returning id`;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, phone) values (${o.id}, 'Main', 'main', '+19545550100') returning id`;
    const [s] = await sql<{ id: string }[]>`insert into sites (org_id, venue_id, slug) values (${o.id}, ${v.id}, ${siteSlug}) returning id`;
    await sql`insert into org_members (org_id, email, role) values (${o.id}, ${owner}, 'owner')`;
    const t: Tenant = { orgId: o.id, actor: owner, role: "owner", venueIds: null };
    const saved = await saveVersion(sql, t, s.id, demo);
    if (!saved.ok) throw new Error("site");
    await publishVersion(sql, t, s.id, saved.versionId);
    return { orgId: o.id, venueId: v.id, tenant: t };
  }

  beforeAll(async () => {
    const a = await mkOrg("appa", slugA, `owner-${tag}@a.example`);
    const b = await mkOrg("appb", slugB, `owner-${tag}@b.example`);
    orgA = a.orgId; orgB = b.orgId; ownerA = a.tenant; ownerB = b.tenant;
    hostA = { orgId: orgA, actor: `host-${tag}@a.example`, role: "host", venueIds: null };
    await sql`insert into org_members (org_id, email, role) values (${orgA}, ${hostA.actor}, 'host')`;
  });

  afterAll(async () => {
    await sql`delete from orgs where id in (${orgA}, ${orgB})`;
    await sql.end();
  });

  const logged = async (orgId: string, action: string) =>
    (await sql<{ n: number }[]>`select count(*)::int as n from change_log where org_id = ${orgId} and action = ${action}`)[0].n;

  it("starts from the website and isn't open to guests until published", async () => {
    const s = await getAppState(sql, ownerA);
    expect(s.draft.name).toBe("Santorini by Georgios");
    expect(s.published).toBeNull();
    expect(s.unpublished).toBe(true);
    expect(await loadGuestApp(sql, slugA)).toBeNull();
  });

  it("saves drafts (logged), refuses bad ones, and keeps them away from guests", async () => {
    const draft: AppConfig = { ...defaultAppConfig(demo as unknown as SiteContent), name: "Santorini", welcome: "Hello from the draft" };
    const bad = await saveAppDraft(sql, ownerA, { ...draft, name: "x".repeat(40) });
    expect(bad.ok).toBe(false);
    expect(await logged(orgA, "app.draft_saved")).toBe(0);

    const r = await saveAppDraft(sql, ownerA, draft);
    expect(r.ok).toBe(true);
    expect(await logged(orgA, "app.draft_saved")).toBe(1);
    expect(await loadGuestApp(sql, slugA)).toBeNull();
    await expect(saveAppDraft(sql, hostA, draft)).rejects.toBeInstanceOf(Forbidden);
  });

  it("publishes the draft (logged); later drafts stay unpublished", async () => {
    expect(await publishApp(sql, ownerA)).toEqual({ ok: true });
    expect(await logged(orgA, "app.published")).toBe(1);
    const live = await loadGuestApp(sql, slugA);
    expect(live?.config.welcome).toBe("Hello from the draft");
    expect(live?.draft).toBe(false);

    const s = await getAppState(sql, ownerA);
    await saveAppDraft(sql, ownerA, { ...s.draft, welcome: "A newer draft" });
    expect((await loadGuestApp(sql, slugA))?.config.welcome).toBe("Hello from the draft");
    expect((await getAppState(sql, ownerA)).unpublished).toBe(true);
    await expect(publishApp(sql, hostA)).rejects.toBeInstanceOf(Forbidden);
  });

  it("shows the draft preview only to signed-in people of that restaurant", async () => {
    const asOwner = await loadGuestApp(sql, slugA, { wantDraft: true, viewer: { email: ownerA.actor, staff: false } });
    expect(asOwner?.draft).toBe(true);
    expect(asOwner?.config.welcome).toBe("A newer draft");
    // A host of the same restaurant can look (view); someone from another restaurant can't.
    expect((await loadGuestApp(sql, slugA, { wantDraft: true, viewer: { email: hostA.actor, staff: false } }))?.draft).toBe(true);
    const stranger = await loadGuestApp(sql, slugA, { wantDraft: true, viewer: { email: ownerB.actor, staff: false } });
    expect(stranger?.draft).toBe(false);
    expect(stranger?.config.welcome).toBe("Hello from the draft");
    const anon = await loadGuestApp(sql, slugA, { wantDraft: true, viewer: null });
    expect(anon?.config.welcome).toBe("Hello from the draft");
    // Unpublished app: a stranger asking for the draft gets nothing at all.
    expect(await loadGuestApp(sql, slugB, { wantDraft: true, viewer: { email: ownerA.actor, staff: false } })).toBeNull();
    expect((await loadGuestApp(sql, slugB, { wantDraft: true, viewer: { email: "studio@thepass.example", staff: true } }))?.draft).toBe(true);
  });

  it("hides buttons for features that are off, and shows them once on", async () => {
    const live = (await loadGuestApp(sql, slugA))!;
    expect(live.features.ordering).toBe(false);
    expect(live.features.loyalty).toBe(false);
    const ids = appTiles(live.config, live.features, "/s/a").map((t) => t.id);
    expect(ids).not.toContain("order");
    expect(ids).not.toContain("loyalty");

    const o = await getOrderingSettings(sql, orgA);
    expect(await saveOrderingSettings(sql, ownerA, { ...o, pickupEnabled: true })).toBeNull();
    await sql`insert into loyalty_programs (org_id, active, visits_required, reward) values (${orgA}, true, 5, 'A dessert on us')`;
    const f = await appFeatures(sql, live.site);
    expect(f.ordering && f.loyalty).toBe(true);
    expect(appTiles(live.config, f, "/s/a").map((t) => t.id)).toEqual(expect.arrayContaining(["order", "loyalty"]));
  });

  it("app levers read the live app, change draft and published together, and log both", async () => {
    const levers = await readLevers(sql, ownerA, "app");
    expect(levers.find((l) => l.def.key === "app_name")?.value).toBe("Santorini");
    expect(levers.find((l) => l.def.key === "tile_instagram")?.value).toBe(false);

    const r = await setLever(sql, ownerA, "app", "app_name", "Santorini Kitchen", "assistant");
    expect(r).toEqual({ ok: true, before: "Santorini", after: "Santorini Kitchen" });
    const live = await loadGuestApp(sql, slugA);
    expect(live?.config.name).toBe("Santorini Kitchen");
    // The waiting draft gets the change too, and its other edits stay unpublished.
    const s = await getAppState(sql, ownerA);
    expect(s.draft.name).toBe("Santorini Kitchen");
    expect(s.draft.welcome).toBe("A newer draft");
    expect(live?.config.welcome).toBe("Hello from the draft");
    expect(await logged(orgA, "lever.changed")).toBeGreaterThanOrEqual(1);
    expect(await logged(orgA, "app.published")).toBe(2);

    expect((await setLever(sql, ownerA, "app", "tile_menu", "off", "assistant")).ok).toBe(true);
    expect((await loadGuestApp(sql, slugA))?.config.tiles.find((t) => t.id === "menu")?.on).toBe(false);

    const faint = await setLever(sql, ownerA, "app", "accent_colour", "#fefefe", "assistant");
    expect(faint.ok).toBe(false);
    if (!faint.ok) expect(faint.error).toMatch(/hard to see/);
    expect((await setLever(sql, hostA, "app", "app_name", "Nope", "assistant")).ok).toBe(false);
  });

  it("the assistant's app changes wait for a person to press Apply", async () => {
    const [th] = await sql<{ id: string }[]>`insert into chat_threads (org_id, created_by) values (${orgA}, ${ownerA.actor}) returning id`;
    const r = await proposeChange(sql, ownerA, th.id, "app", "welcome_line", "Come hungry.", "Owner asked");
    expect(r).toMatchObject({ status: "waiting_for_apply", before: "Hello from the draft", after: "Come hungry." });
    expect((await loadGuestApp(sql, slugA))?.config.welcome).toBe("Hello from the draft");
    expect(await applyChange(sql, ownerA, (r as { id: string }).id)).toEqual({ ok: true });
    expect((await loadGuestApp(sql, slugA))?.config.welcome).toBe("Come hungry.");
  });

  it("shows rewards progress only from the guest's own booking link, and only at that restaurant", async () => {
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name, visit_count) values (${orgA}, ${`+1954555${tag.replace(/\D/g, "0").slice(0, 4)}`}, 'Maria Lopez', 7) returning id`;
    const [v] = await sql<{ id: string }[]>`select id from venues where org_id = ${orgA}`;
    const token = `tok${tag}abcdefgh`;
    await sql`insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, manage_token)
              values (${orgA}, ${v.id}, ${g.id}, 2, now() + interval '1 day', now() + interval '1 day 2 hours', ${token})`;
    expect(await rewardsForBooking(sql, orgA, token)).toMatchObject({ firstName: "Maria", visits: 7, visitsRequired: 5, toNext: 3, reward: "A dessert on us", waiting: null });
    expect(await rewardsForBooking(sql, orgB, token)).toBeNull();
    expect(await rewardsForBooking(sql, orgA, "not-a-real-token")).toBeNull();
    expect(await rewardsForBooking(sql, orgA, "x' or 1=1 --")).toBeNull();
    expect(await publicProgram(sql, orgB)).toBeNull();
  });

  it("stores nothing for push until keys are configured", async () => {
    const r = await savePushSubscription(sql, orgA, sub("1"), null);
    expect(r).toEqual({ stored: false, reason: "not_configured", error: "Updates are coming soon." });
    expect(await pushSubscriberCount(sql, ownerA)).toBe(0);
  });

  it("stores valid subscriptions per restaurant, once each, and never moves one between restaurants", async () => {
    expect(await savePushSubscription(sql, orgA, sub("1"), VAPID)).toEqual({ stored: true });
    expect(await savePushSubscription(sql, orgA, sub("1"), VAPID)).toEqual({ stored: true }); // refresh, not a second row
    expect(await savePushSubscription(sql, orgA, sub("2"), VAPID)).toEqual({ stored: true });
    expect((await savePushSubscription(sql, orgA, { subscription: { endpoint: "http://x.example", keys: {} } }, VAPID)).stored).toBe(false);
    expect(await pushSubscriberCount(sql, ownerA)).toBe(2);

    const stolen = await savePushSubscription(sql, orgB, sub("1"), VAPID);
    expect(stolen.stored).toBe(false);
    expect(await pushSubscriberCount(sql, ownerB)).toBe(0);
    expect(await removePushSubscription(sql, orgB, sub("1").subscription.endpoint)).toBe(false);
    expect(await removePushSubscription(sql, orgA, sub("2").subscription.endpoint)).toBe(true);
    expect(await pushSubscriberCount(sql, ownerA)).toBe(1);
  });

  it("keeps each restaurant's app to itself", async () => {
    const b = await getAppState(sql, ownerB);
    expect(b.published).toBeNull();
    expect(b.draft.name).toBe("Santorini by Georgios");
    await saveAppDraft(sql, ownerB, { ...b.draft, name: "Other place" });
    expect((await getAppState(sql, ownerA)).draft.name).toBe("Santorini Kitchen");
    expect(await readLevers(sql, ownerB, "app")).toEqual(expect.arrayContaining([expect.objectContaining({ value: "Other place" })]));
  });
});
