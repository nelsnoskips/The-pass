import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import demo from "@/lib/sites/demo-content.json";
import { websiteAgent } from "@/lib/agent-runtime/agents/website";
import { runAgent, type MessagesClient } from "@/lib/agent-runtime/runner";
import { describeChanges } from "@/lib/sites/diff";
import { parseSiteContent, type SiteContent } from "@/lib/sites/content";
import { getPublishedSite, listVersions, publishVersion, saveVersion } from "@/lib/sites/repo";
import type { Tenant } from "@/lib/platform/tenant";

const base = (): SiteContent => {
  const r = parseSiteContent(demo);
  if (!r.ok) throw new Error("demo invalid");
  return structuredClone(r.content);
};

describe("describeChanges", () => {
  it("says what changed in an owner's words", () => {
    const a = base();
    const b = base();
    b.announcement = "Closed Thanksgiving Day";
    b.menus[0].sections[1].items[1].priceCents = 5200;
    b.menus[0].sections[0].items.push({ id: "burrata", name: "Burrata", description: "Heirloom tomatoes.", priceCents: 1900, tags: ["vegetarian"] });
    b.menus[0].sections[1].items = b.menus[0].sections[1].items.filter((i) => i.id !== "moussaka");
    expect(describeChanges(a, b)).toEqual([
      'Notice bar: "Closed Thanksgiving Day"',
      // In menu order: Meze comes before From the Fire.
      "Added Burrata (Dinner › Meze, $19)",
      "Lamb Chops: $48 → $52",
      "Removed Moussaka",
    ]);
    expect(describeChanges(a, base())).toEqual([]);
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

type Block = Anthropic.Beta.Messages.BetaContentBlock;
const toolUse = (name: string, input: unknown): Block => ({ type: "tool_use", id: `toolu_${randomUUID()}`, name, input }) as Block;
const text = (t: string): Block => ({ type: "text", text: t, citations: null }) as Block;
function scripted(turns: Block[][]) {
  const seen: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming[] = [];
  let i = 0;
  const client: MessagesClient = {
    beta: {
      messages: {
        async create(params) {
          seen.push(structuredClone(params));
          const content = turns[i++] ?? [text("Done.")];
          return {
            id: "msg", type: "message", role: "assistant", model: params.model, content,
            stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn", stop_sequence: null,
            usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
          } as unknown as Anthropic.Beta.Messages.BetaMessage;
        },
      },
    },
  };
  return { client, seen };
}

d("Website Agent", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  const slug = `wa-${randomUUID().slice(0, 8)}`;
  let orgId = "", siteId = "";
  let owner: Tenant, host: Tenant;

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('WA', ${slug}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug) values (${orgId}, 'Main', 'main') returning id`;
    const [s] = await sql<{ id: string }[]>`insert into sites (org_id, venue_id, slug) values (${orgId}, ${v.id}, ${slug}) returning id`;
    siteId = s.id;
    owner = { orgId, actor: "owner@wa", role: "owner", venueIds: null };
    host = { orgId, actor: "host@wa", role: "host", venueIds: null };
    const saved = await saveVersion(sql, owner, siteId, demo, "Initial");
    if (!saved.ok) throw new Error("seed");
    await publishVersion(sql, owner, siteId, saved.versionId);
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  const run = (tenant: Tenant, turns: Block[][]) => {
    const s = scripted(turns);
    return runAgent({ sql, agent: websiteAgent(), tenant, trigger: "test", task: "The owner asks: notice", client: s.client }).then((o) => ({ ...o, seen: s.seen }));
  };

  it("reads the site, saves the edit as a draft, and leaves the live site alone", async () => {
    const edited = base();
    edited.announcement = "Closed Thanksgiving Day";
    const out = await run(owner, [
      [toolUse("get_site", {})],
      [toolUse("save_site_draft", { content_json: JSON.stringify(edited), note: "Thanksgiving notice" })],
      [text("Added the notice. It's a draft — preview and publish when ready.")],
    ]);
    expect(out.actions.map((a) => a.verdict)).toEqual(["ran", "ran"]);
    // The model was handed the real content.
    const firstResult = (out.seen[1].messages.at(-1)!.content as Anthropic.Beta.Messages.BetaToolResultBlockParam[])[0];
    expect(JSON.parse(firstResult.content as string).brand.name).toBe("Santorini by Georgios");

    const [newest] = await listVersions(sql, owner, siteId);
    expect(newest.created_by).toBe("agent:website");
    expect(newest.note).toBe("Thanksgiving notice (Website Agent)");
    expect(newest.live).toBe(false);
    expect((await getPublishedSite(sql, slug))?.content.announcement).toBe("");
  });

  it("refuses invalid content and tells the model exactly what to fix", async () => {
    const bad = base() as unknown as Record<string, Record<string, string>>;
    bad.theme.accent = "blue";
    const before = (await listVersions(sql, owner, siteId)).length;
    const out = await run(owner, [[toolUse("save_site_draft", { content_json: JSON.stringify(bad), note: "x" })], [text("Couldn't.")]]);
    expect(out.actions[0].verdict).toBe("denied");
    const result = (out.seen[1].messages.at(-1)!.content as Anthropic.Beta.Messages.BetaToolResultBlockParam[])[0];
    expect(result.content).toContain("theme.accent must be a hex colour");
    expect((await listVersions(sql, owner, siteId)).length).toBe(before);
  });

  it("acts with the asker's permissions: a host's request can't save", async () => {
    const edited = base();
    edited.announcement = "Hosts can't do this";
    const out = await run(host, [[toolUse("save_site_draft", { content_json: JSON.stringify(edited), note: "x" })], [text("No.")]]);
    expect(out.actions[0].verdict).toBe("denied");
  });

  it("saves nothing when nothing changed", async () => {
    const before = (await listVersions(sql, owner, siteId)).length;
    const [latest] = await listVersions(sql, owner, siteId);
    const [row] = await sql<{ content: unknown }[]>`select content from site_versions where id = ${latest.id}`;
    const out = await run(owner, [[toolUse("save_site_draft", { content_json: JSON.stringify(row.content), note: "x" })], [text("Nothing to do.")]]);
    expect(out.actions[0].verdict).toBe("ran");
    expect((await listVersions(sql, owner, siteId)).length).toBe(before);
  });
});
