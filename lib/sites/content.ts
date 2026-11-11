/**
 * What a restaurant website is made of. One typed document per version;
 * themes render it, editors and agents change it, and `parseSiteContent`
 * stands between any write and the database.
 */

export interface MenuItem {
  /** Stable across edits; Ordering will key on it. */
  id: string;
  name: string;
  description: string;
  /** Integer cents. null = "market price" / unpriced. */
  priceCents: number | null;
  /** e.g. "vegetarian", "gluten-free", "spicy". */
  tags: string[];
}

export interface MenuSection {
  id: string;
  name: string;
  note: string;
  items: MenuItem[];
}

export interface Menu {
  id: string;
  name: string;
  sections: MenuSection[];
}

export interface HoursRow {
  /** As shown: "Tuesday – Thursday". */
  days: string;
  /** As shown: "5 pm – 10 pm", or "Closed". */
  hours: string;
}

export interface SiteContent {
  brand: {
    name: string;
    tagline: string;
    cuisine: string;
    /** "$" – "$$$$" */
    priceRange: string;
  };
  theme: {
    /** Hex colours. Paper is the page, ink the text, accent the calls to action. */
    paper: string;
    ink: string;
    accent: string;
  };
  hero: { headline: string; sub: string; image: string | null };
  story: { heading: string; body: string };
  menus: Menu[];
  hours: HoursRow[];
  contact: { address: string; phone: string; email: string; mapUrl: string };
  /** A line across the top of the site: closures, specials, events. */
  announcement: string;
  social: { instagram: string };
}

export type ParseResult =
  | { ok: true; content: SiteContent }
  | { ok: false; errors: string[] };

const HEX = /^#[0-9a-fA-F]{6}$/;
const LIMITS = { short: 120, long: 2000, menus: 8, sections: 20, items: 80, hours: 14 };

/**
 * Validates and normalizes untrusted input into a SiteContent. Unknown
 * keys are dropped; anything wrong is reported by path so an editor (or
 * an agent) can be told exactly what to fix.
 */
export function parseSiteContent(input: unknown): ParseResult {
  const errors: string[] = [];
  const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const text = (v: unknown, path: string, max: number, required = false): string => {
    if (v === undefined || v === null) v = "";
    if (typeof v !== "string") { errors.push(`${path} must be text`); return ""; }
    const t = v.trim();
    if (required && !t) errors.push(`${path} is required`);
    if (t.length > max) errors.push(`${path} is longer than ${max} characters`);
    return t;
  };
  const list = (v: unknown, path: string, max: number): unknown[] => {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) { errors.push(`${path} must be a list`); return []; }
    if (v.length > max) errors.push(`${path} has more than ${max} entries`);
    return v.slice(0, max);
  };
  const color = (v: unknown, path: string): string => {
    if (typeof v !== "string" || !HEX.test(v)) { errors.push(`${path} must be a hex colour like #1a2b3c`); return "#000000"; }
    return v.toLowerCase();
  };
  const id = (v: unknown, path: string, seen: Set<string>): string => {
    const t = text(v, path, 64, true);
    if (t && !/^[a-z0-9][a-z0-9_-]*$/.test(t)) errors.push(`${path} may only use a-z, 0-9, - and _`);
    if (seen.has(t)) errors.push(`${path} "${t}" is used twice`);
    seen.add(t);
    return t;
  };
  const link = (v: unknown, path: string): string => {
    const t = text(v, path, 500);
    if (t && !/^https:\/\//.test(t) && !t.startsWith("/")) errors.push(`${path} must be an https link`);
    return t;
  };

  const root = obj(input);
  const brand = obj(root.brand);
  const theme = obj(root.theme);
  const hero = obj(root.hero);
  const story = obj(root.story);
  const contact = obj(root.contact);
  const social = obj(root.social);

  const menuIds = new Set<string>();
  const itemIds = new Set<string>();
  const menus: Menu[] = list(root.menus, "menus", LIMITS.menus).map((m, mi) => {
    const menu = obj(m);
    const sectionIds = new Set<string>();
    return {
      id: id(menu.id, `menus[${mi}].id`, menuIds),
      name: text(menu.name, `menus[${mi}].name`, LIMITS.short, true),
      sections: list(menu.sections, `menus[${mi}].sections`, LIMITS.sections).map((s, si) => {
        const section = obj(s);
        const sp = `menus[${mi}].sections[${si}]`;
        return {
          id: id(section.id, `${sp}.id`, sectionIds),
          name: text(section.name, `${sp}.name`, LIMITS.short, true),
          note: text(section.note, `${sp}.note`, 300),
          items: list(section.items, `${sp}.items`, LIMITS.items).map((it, ii) => {
            const item = obj(it);
            const ip = `${sp}.items[${ii}]`;
            let priceCents: number | null = null;
            if (item.priceCents !== null && item.priceCents !== undefined) {
              if (typeof item.priceCents === "number" && Number.isInteger(item.priceCents) && item.priceCents >= 0 && item.priceCents < 10_000_000) {
                priceCents = item.priceCents;
              } else errors.push(`${ip}.priceCents must be a whole number of cents`);
            }
            return {
              id: id(item.id, `${ip}.id`, itemIds),
              name: text(item.name, `${ip}.name`, LIMITS.short, true),
              description: text(item.description, `${ip}.description`, 400),
              priceCents,
              tags: list(item.tags, `${ip}.tags`, 8).map((t, ti) => text(t, `${ip}.tags[${ti}]`, 30, true)),
            };
          }),
        };
      }),
    };
  });

  const content: SiteContent = {
    brand: {
      name: text(brand.name, "brand.name", LIMITS.short, true),
      tagline: text(brand.tagline, "brand.tagline", 200),
      cuisine: text(brand.cuisine, "brand.cuisine", LIMITS.short),
      priceRange: text(brand.priceRange, "brand.priceRange", 4),
    },
    theme: {
      paper: color(theme.paper, "theme.paper"),
      ink: color(theme.ink, "theme.ink"),
      accent: color(theme.accent, "theme.accent"),
    },
    hero: {
      headline: text(hero.headline, "hero.headline", 160, true),
      sub: text(hero.sub, "hero.sub", 400),
      image: link(hero.image, "hero.image") || null,
    },
    story: {
      heading: text(story.heading, "story.heading", LIMITS.short),
      body: text(story.body, "story.body", LIMITS.long),
    },
    menus,
    hours: list(root.hours, "hours", LIMITS.hours).map((h, hi) => ({
      days: text(obj(h).days, `hours[${hi}].days`, 60, true),
      hours: text(obj(h).hours, `hours[${hi}].hours`, 60, true),
    })),
    contact: {
      address: text(contact.address, "contact.address", 300),
      phone: text(contact.phone, "contact.phone", 40),
      email: text(contact.email, "contact.email", 200),
      mapUrl: link(contact.mapUrl, "contact.mapUrl"),
    },
    announcement: text(root.announcement, "announcement", 240),
    social: { instagram: link(social.instagram, "social.instagram") },
  };
  if (content.brand.priceRange && !/^\${1,4}$/.test(content.brand.priceRange)) {
    errors.push("brand.priceRange must be $ to $$$$");
  }

  return errors.length ? { ok: false, errors } : { ok: true, content };
}

export function formatPrice(cents: number | null): string {
  if (cents === null) return "MP";
  return cents % 100 === 0 ? `${cents / 100}` : (cents / 100).toFixed(2);
}
