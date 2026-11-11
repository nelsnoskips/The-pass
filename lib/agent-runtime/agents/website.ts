import { parseSiteContent } from "../../sites/content";
import { describeChanges } from "../../sites/diff";
import { getVersion, listVersions, saveVersion, siteForOrg } from "../../sites/repo";
import type { AgentSpec } from "../runner";
import { defineTool, type AgentContext } from "../tool";

/**
 * Website Agent: an owner describes a change in plain words; the agent
 * writes it as a new draft version of the site. It can never publish —
 * publishing stays a person's click in the editor — so a draft is safe to
 * create without asking, and the owner reviews the change summary and the
 * preview before anything is live.
 */

async function latest(ctx: AgentContext) {
  const site = await siteForOrg(ctx.sql, ctx.tenant);
  if (!site) return null;
  const [v] = await listVersions(ctx.sql, ctx.tenant, site.id);
  const content = v ? await getVersion(ctx.sql, ctx.tenant, v.id) : null;
  return content ? { site, versionId: v.id, content } : null;
}

const getSite = defineTool<Record<string, never>>({
  name: "get_site",
  description:
    "Returns the restaurant's current website content as JSON: brand, theme colours, hero, story, menus (sections and items with id, name, description, priceCents as integer cents or null for market price, tags), hours, contact, announcement. Call this first.",
  inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
  tier: "auto",
  requires: "view",
  async run(ctx) {
    const l = await latest(ctx);
    if (!l) throw new Error("This restaurant has no website yet.");
    return l.content;
  },
});

const saveDraft = defineTool<{ content_json: string; note: string }>({
  name: "save_site_draft",
  description:
    "Save the complete, updated website content as a new draft. It is not published; the owner previews and publishes it. Pass the whole document from get_site with only the requested changes made, as a JSON string. Keep every existing id; give new menu items a new lowercase id (letters, digits, hyphens). If it is refused, the reason lists exactly what to fix.",
  inputSchema: {
    type: "object",
    properties: {
      content_json: { type: "string", description: "The full SiteContent document as JSON." },
      note: { type: "string", description: "A short history note in the owner's words, e.g. 'Thanksgiving hours, moussaka sold out'." },
    },
    required: ["content_json", "note"],
    additionalProperties: false,
  },
  tier: "auto",
  requires: "manage_venue",
  check(_ctx, input) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(input.content_json));
    } catch {
      return { ok: false, reason: "content_json is not valid JSON." };
    }
    const r = parseSiteContent(parsed);
    return r.ok ? { ok: true } : { ok: false, reason: `Fix these and save again: ${r.errors.slice(0, 10).join("; ")}` };
  },
  async run(ctx, input) {
    const l = await latest(ctx);
    if (!l) throw new Error("This restaurant has no website yet.");
    const parsed = parseSiteContent(JSON.parse(input.content_json));
    if (!parsed.ok) throw new Error(parsed.errors.join("; "));
    const changes = describeChanges(l.content, parsed.content);
    if (changes.length === 0) return { saved: false, reason: "Nothing changed." };
    const saved = await saveVersion(ctx.sql, ctx.tenant, l.site.id, parsed.content, `${input.note.slice(0, 180)} (Website Agent)`);
    if (!saved.ok) throw new Error(saved.errors.join("; "));
    return { saved: true, versionId: saved.versionId, changes };
  },
});

export function websiteAgent(): AgentSpec {
  return {
    id: "website",
    name: "Website Agent",
    effort: "low",
    maxTurns: 6,
    system: `You are the Website Agent for a restaurant, inside The Pass. The owner describes a change to their website in plain words and you make exactly that change as a draft.

Work like this: call get_site, make only the change that was asked for, then call save_site_draft once with the whole updated document. Leave everything else exactly as it is: same ids, same wording, same order. Never invent dishes, prices, hours, events or offers the owner didn't give you. If a request is ambiguous in a way that matters (which menu, what price), make the most literal reasonable change and say what you assumed. If the request isn't about the website, or you can't do it with these tools, don't save anything and say so.

Prices are integer cents (14 dollars is 1400). "Sold out" or "off the menu tonight" means removing the dish unless the owner says to mark it; the restaurant can restore it from the history.

Finish with one or two plain sentences for the owner: what you changed, anything you assumed, and that it's a draft they can preview and publish.`,
    tools: [getSite, saveDraft],
  };
}
