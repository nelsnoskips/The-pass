import type { SiteContent } from "../sites/content";

/**
 * The restaurant's own app: what it's called, its colours and icon, and
 * the buttons on its home screen. One typed document, validated here on
 * every write (the builder, the assistant's levers) and every read (the
 * guest app, the manifest), so a bad value can never reach a guest.
 *
 * Pure: no database, safe to import in the browser for live checks.
 */

export const TILE_IDS = ["order", "reserve", "menu", "loyalty", "gift_cards", "hours", "call", "instagram"] as const;
export type TileId = (typeof TILE_IDS)[number];

export const TILES: Record<TileId, { label: string; hint: string }> = {
  order: { label: "Order pickup", hint: "Your online ordering page" },
  reserve: { label: "Book a table", hint: "Your booking page" },
  menu: { label: "Menu", hint: "Your menu from the website" },
  loyalty: { label: "Rewards", hint: "Your loyalty program" },
  gift_cards: { label: "Gift cards", hint: "Your gift card page" },
  hours: { label: "Hours & location", hint: "Hours, address and directions" },
  call: { label: "Call us", hint: "Rings the restaurant" },
  instagram: { label: "Instagram", hint: "Your Instagram page" },
};

export interface AppTileSetting { id: TileId; on: boolean }

export interface AppConfig {
  /** Shown in the app's top bar and the install prompt. */
  name: string;
  /** Under the icon on a home screen; long names get cut off there. */
  shortName: string;
  /** Hex. Buttons, the top bar and the icon. */
  accent: string;
  /** Hex. The app's page colour; text is black or white, whichever reads. */
  background: string;
  /** Generated, never uploaded: initials or one character on the accent. */
  icon: { mode: "initials" | "glyph"; glyph: string };
  welcome: string;
  tiles: AppTileSetting[];
  /** Optional line across the top of the app's home. */
  announcement: string;
}

export const LIMITS = { name: 30, shortName: 12, welcome: 80, announcement: 120 };

export type AppField = "name" | "shortName" | "accent" | "background" | "icon" | "welcome" | "tiles" | "announcement";
export interface AppError { field: AppField; message: string }

export type AppParse =
  | { ok: true; config: AppConfig; notes: string[] }
  | { ok: false; errors: AppError[] };

const HEX = /^#[0-9a-f]{6}$/i;
const GLYPH = /^[A-Z0-9&]$/;
/** Accent against the background: buttons and the active tab must stand out (WCAG non-text, 3:1). */
export const MIN_ACCENT_CONTRAST = 3;
/** Body text against the background (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5;

/* ------------------------------------------------------------ colour -- */

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const DARK = "#111111";
const LIGHT = "#ffffff";

/** Near-black or white, whichever has more contrast on this colour; pure black where near-black would fall under 4.5:1. */
export function textOn(bg: string): string {
  const dark = contrast(DARK, bg), light = contrast(LIGHT, bg);
  if (dark >= light) return dark >= MIN_TEXT_CONTRAST ? DARK : "#000000";
  // Black or white always reaches 4.58:1 on any colour.
  return light >= MIN_TEXT_CONTRAST || light >= contrast("#000000", bg) ? LIGHT : "#000000";
}

/**
 * The nearest colour to `accent` that stands out on `bg` by `min`:
 * darkened on a light background, lightened on a dark one. The hue
 * stays; only the shade moves.
 */
export function adjustAccent(accent: string, bg: string, min = MIN_ACCENT_CONTRAST): string {
  if (contrast(accent, bg) >= min) return accent.toLowerCase();
  const towards = luminance(bg) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  const from = channels(accent);
  for (let step = 1; step <= 20; step++) {
    const t = step / 20;
    const c = toHex(from.map((v, i) => v + (towards[i] - v) * t) as [number, number, number]);
    if (contrast(c, bg) >= min) return c;
  }
  return toHex(towards as [number, number, number]);
}

/* ------------------------------------------------------------- icon --- */

const SMALL_WORDS = new Set(["the", "by", "and", "of", "at", "a", "on", "in", "&"]);

/** "Santorini by Georgios" → "SG"; "Blue" → "B". Letters and digits only. */
export function initialsOf(name: string): string {
  const words = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, "")).filter(Boolean);
  const big = words.filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
  const pick = (big.length ? big : words).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return pick || "R";
}

/** What the icon shows. */
export function iconText(c: Pick<AppConfig, "icon" | "name">): string {
  return c.icon.mode === "glyph" && c.icon.glyph ? c.icon.glyph : initialsOf(c.name);
}

/* ---------------------------------------------------------- defaults --- */

function cut(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const at = t.lastIndexOf(" ", max);
  return (at > max / 2 ? t.slice(0, at) : t.slice(0, max)).trim();
}

/** A sensible first app from the website: its name, colours and tagline. */
export function defaultAppConfig(content: SiteContent): AppConfig {
  const name = cut(content.brand.name || "Our restaurant", LIMITS.name);
  const firstWord = name.split(/\s+/)[0] ?? name;
  const background = HEX.test(content.theme.paper) ? content.theme.paper.toLowerCase() : "#ffffff";
  const accent = adjustAccent(HEX.test(content.theme.accent) ? content.theme.accent : "#1f3a5f", background);
  return {
    name,
    shortName: cut(firstWord.length <= LIMITS.shortName ? firstWord : name, LIMITS.shortName),
    accent,
    background,
    icon: { mode: "initials", glyph: "" },
    welcome: cut(content.brand.tagline || `Welcome to ${name}.`, LIMITS.welcome),
    tiles: TILE_IDS.map((id) => ({ id, on: id !== "instagram" })),
    announcement: "",
  };
}

/* ------------------------------------------------------------- parse --- */

/**
 * Validate untrusted input into an AppConfig. With `adjust`, an accent
 * that doesn't stand out on the background is shaded until it does and
 * a note says so; without it, that's an error with a suggestion.
 */
export function parseAppConfig(input: unknown, opts: { adjust?: boolean } = {}): AppParse {
  const errors: AppError[] = [];
  const notes: string[] = [];
  const root = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};

  const text = (field: AppField, label: string, max: number, required: boolean): string => {
    const v = root[field];
    if (v !== undefined && v !== null && typeof v !== "string") { errors.push({ field, message: `${label} must be text.` }); return ""; }
    const t = String(v ?? "").replace(/\s+/g, " ").trim();
    if (required && !t) errors.push({ field, message: `${label} is required.` });
    else if (t.length > max) errors.push({ field, message: `${label} can be at most ${max} characters (it's ${t.length}).` });
    return t;
  };
  const colour = (field: "accent" | "background", label: string): string => {
    const v = typeof root[field] === "string" ? (root[field] as string).trim() : "";
    if (!HEX.test(v)) { errors.push({ field, message: `${label} must be a colour like #1a2b3c.` }); return ""; }
    return v.toLowerCase();
  };

  const name = text("name", "App name", LIMITS.name, true);
  const shortName = text("shortName", "Home screen name", LIMITS.shortName, true);
  const welcome = text("welcome", "Welcome line", LIMITS.welcome, false);
  const announcement = text("announcement", "Announcement", LIMITS.announcement, false);
  const background = colour("background", "Background colour");
  let accent = colour("accent", "Accent colour");

  if (accent && background) {
    // Text is chosen black or white, so it always reads; the accent is the owner's choice and may not.
    const ratio = contrast(accent, background);
    if (ratio < MIN_ACCENT_CONTRAST) {
      const better = adjustAccent(accent, background);
      if (opts.adjust) {
        notes.push(`Your accent ${accent} was hard to see on the background (${ratio.toFixed(1)}:1), so we used ${better} instead. Pick another colour if you'd rather.`);
        accent = better;
      } else {
        errors.push({ field: "accent", message: `That accent is hard to see on the background (${ratio.toFixed(1)}:1, needs ${MIN_ACCENT_CONTRAST}:1). Try ${better}.` });
      }
    }
    if (contrast(textOn(background), background) < MIN_TEXT_CONTRAST) {
      errors.push({ field: "background", message: "Text can't be made readable on that background. Pick a lighter or darker colour." });
    }
  }

  const iconIn = root.icon && typeof root.icon === "object" ? (root.icon as Record<string, unknown>) : {};
  const mode = iconIn.mode === "glyph" ? "glyph" : "initials";
  const glyph = typeof iconIn.glyph === "string" ? iconIn.glyph.trim().toUpperCase() : "";
  if (mode === "glyph" && !GLYPH.test(glyph)) {
    errors.push({ field: "icon", message: "The icon character must be one letter, number or &." });
  }

  const tiles: AppTileSetting[] = [];
  if (root.tiles !== undefined && !Array.isArray(root.tiles)) errors.push({ field: "tiles", message: "Home buttons must be a list." });
  const seen = new Set<string>();
  for (const raw of Array.isArray(root.tiles) ? root.tiles.slice(0, 20) : []) {
    const t = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const id = String(t.id ?? "");
    if (!(TILE_IDS as readonly string[]).includes(id)) { errors.push({ field: "tiles", message: `There's no home button called "${id.slice(0, 30)}".` }); continue; }
    if (seen.has(id)) { errors.push({ field: "tiles", message: `${TILES[id as TileId].label} is listed twice.` }); continue; }
    seen.add(id);
    tiles.push({ id: id as TileId, on: t.on === true });
  }
  // Buttons added in a later release join at the end, off.
  for (const id of TILE_IDS) if (!seen.has(id)) tiles.push({ id, on: false });

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    notes,
    config: { name, shortName, accent, background, icon: { mode, glyph: mode === "glyph" ? glyph : "" }, welcome, tiles, announcement },
  };
}

/* ------------------------------------------------------------- tiles --- */

/** What the restaurant has switched on, which decides which buttons can show. */
export interface AppFeatures {
  ordering: boolean;
  loyalty: boolean;
  menu: boolean;
  hours: boolean;
  phone: string;
  instagram: string;
  giftCardsOnline: boolean;
}

/** Whether a button can appear in the app, and if not, why — in the owner's words. */
export function tileStatus(id: TileId, f: AppFeatures): { available: boolean; why: string | null } {
  const no = (why: string) => ({ available: false, why });
  switch (id) {
    case "order": return f.ordering ? { available: true, why: null } : no("Online ordering is off");
    case "loyalty": return f.loyalty ? { available: true, why: null } : no("Loyalty is off");
    case "menu": return f.menu ? { available: true, why: null } : no("Your website has no menu yet");
    case "hours": return f.hours ? { available: true, why: null } : no("Your website has no hours or address yet");
    case "call": return f.phone ? { available: true, why: null } : no("Your website has no phone number");
    case "instagram": return f.instagram ? { available: true, why: null } : no("Your website has no Instagram link");
    case "gift_cards": return { available: true, why: f.giftCardsOnline ? null : "Shows that gift cards are sold at the restaurant until card payments are connected" };
    case "reserve": return { available: true, why: null };
  }
}

export interface AppTile { id: TileId; label: string; href: string; external: boolean }

/**
 * The buttons a guest sees, in the owner's order: switched on AND
 * available. `q` is appended to links inside the app (the preview keeps
 * its ?preview=draft).
 */
export function appTiles(c: AppConfig, f: AppFeatures, base: string, q = ""): AppTile[] {
  const href: Record<TileId, string> = {
    order: `${base}/order`,
    reserve: `${base}/reserve`,
    menu: `${base}/app/menu${q}`,
    loyalty: `${base}/app/rewards${q}`,
    gift_cards: `${base}/gift-cards`,
    hours: `${base}/app/visit${q}`,
    call: `tel:${f.phone.replace(/[^\d+]/g, "")}`,
    instagram: f.instagram,
  };
  return c.tiles
    .filter((t) => t.on && tileStatus(t.id, f).available)
    .map((t) => ({ id: t.id, label: TILES[t.id].label, href: href[t.id], external: t.id === "instagram" || t.id === "call" }));
}

/* ---------------------------------------------------------- manifest --- */

/** The web app manifest for /s/<site>/app. `base` is "/s/<site>". */
export function buildManifest(c: AppConfig, base: string) {
  return {
    id: `${base}/app`,
    name: c.name,
    short_name: c.shortName,
    description: c.welcome || c.name,
    start_url: `${base}/app`,
    scope: `${base}/`,
    display: "standalone" as const,
    orientation: "portrait" as const,
    background_color: c.background,
    theme_color: c.accent,
    icons: [
      { src: `${base}/app/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/app/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/app/icon-512.png?maskable=1`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

/** Same content, compared without caring about key order. */
export function sameConfig(a: AppConfig | null, b: AppConfig | null): boolean {
  if (!a || !b) return a === b;
  const norm = (c: AppConfig) => JSON.stringify([c.name, c.shortName, c.accent, c.background, c.icon.mode, c.icon.glyph, c.welcome, c.tiles.map((t) => `${t.id}:${t.on}`), c.announcement]);
  return norm(a) === norm(b);
}
