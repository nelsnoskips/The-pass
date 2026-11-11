import type { SiteContent } from "./content";

/**
 * What changed between two versions, in an owner's words. Shown next to
 * every agent draft so "it changed the hours and two prices" is visible
 * before anyone opens a preview.
 */
export function describeChanges(before: SiteContent, after: SiteContent): string[] {
  const out: string[] = [];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  if (before.announcement !== after.announcement) {
    out.push(after.announcement ? `Notice bar: "${after.announcement}"` : "Notice bar removed");
  }
  if (!same(before.hours, after.hours)) out.push("Hours changed");
  if (!same(before.hero, after.hero)) out.push("Front page changed");
  if (!same(before.story, after.story)) out.push("Story changed");
  if (!same(before.theme, after.theme)) out.push("Colours changed");
  if (!same(before.contact, after.contact)) out.push("Contact details changed");
  if (!same(before.brand, after.brand)) out.push("Name or tagline changed");

  const items = (c: SiteContent) =>
    new Map(
      c.menus.flatMap((m) =>
        m.sections.flatMap((s) => s.items.map((i) => [i.id, { ...i, where: `${m.name} › ${s.name}` }] as const)),
      ),
    );
  const a = items(before);
  const b = items(after);
  const price = (c: number | null) => (c === null ? "MP" : `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`);
  for (const [id, i] of b) {
    const was = a.get(id);
    if (!was) {
      out.push(`Added ${i.name} (${i.where}, ${price(i.priceCents)})`);
      continue;
    }
    if (was.priceCents !== i.priceCents) out.push(`${i.name}: ${price(was.priceCents)} → ${price(i.priceCents)}`);
    if (was.name !== i.name) out.push(`Renamed ${was.name} → ${i.name}`);
    if (was.description !== i.description || !same(was.tags, i.tags)) out.push(`${i.name}: description or tags changed`);
  }
  for (const [id, i] of a) if (!b.has(id)) out.push(`Removed ${i.name}`);

  const layout = (c: SiteContent) => c.menus.map((m) => `${m.name}:${m.sections.map((s) => `${s.name}/${s.note}`).join(",")}`).join("|");
  if (layout(before) !== layout(after)) out.push("Menu sections changed");
  return out;
}
