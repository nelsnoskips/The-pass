import { describe, expect, it } from "vitest";
import demo from "@/lib/sites/demo-content.json";
import {
  adjustAccent, appTiles, buildManifest, contrast, defaultAppConfig, initialsOf, parseAppConfig, textOn, TILE_IDS, tileStatus,
  type AppConfig, type AppFeatures,
} from "@/lib/app/config";
import { parsePushSubscription } from "@/lib/app/push";
import { qrMatrix, qrSvgPath } from "@/lib/app/qr";
import { serviceWorkerSource } from "@/lib/app/sw";
import { LEVERS } from "@/lib/levers";
import type { SiteContent } from "@/lib/sites/content";

const site = demo as unknown as SiteContent;
const base = (): AppConfig => defaultAppConfig(site);
const allOn: AppFeatures = { ordering: true, loyalty: true, menu: true, hours: true, phone: "(954) 555-0100", instagram: "https://instagram.com/x", giftCardsOnline: false };

describe("app config: defaults", () => {
  it("starts from the website: name, colours, tagline, every button but Instagram", () => {
    const c = base();
    expect(c.name).toBe("Santorini by Georgios");
    expect(c.shortName).toBe("Santorini");
    expect(c.background).toBe(site.theme.paper.toLowerCase());
    expect(contrast(c.accent, c.background)).toBeGreaterThanOrEqual(3);
    expect(c.tiles.map((t) => t.id)).toEqual([...TILE_IDS]);
    expect(c.tiles.find((t) => t.id === "instagram")?.on).toBe(false);
    expect(parseAppConfig(c).ok).toBe(true);
  });

  it("makes initials from the meaningful words", () => {
    expect(initialsOf("Santorini by Georgios")).toBe("SG");
    expect(initialsOf("The Blue")).toBe("B");
    expect(initialsOf("Café Olé")).toBe("CO");
    expect(initialsOf("   ")).toBe("R");
  });
});

describe("app config: validation", () => {
  it("enforces the lengths, in plain English, by field", () => {
    const r = parseAppConfig({ ...base(), name: "x".repeat(31), shortName: "y".repeat(13), welcome: "z".repeat(81), announcement: "a".repeat(121) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.field).sort()).toEqual(["announcement", "name", "shortName", "welcome"]);
    expect(r.errors.find((e) => e.field === "name")?.message).toBe("App name can be at most 30 characters (it's 31).");
    expect(parseAppConfig({ ...base(), name: "x".repeat(30), shortName: "y".repeat(12), welcome: "z".repeat(80), announcement: "a".repeat(120) }).ok).toBe(true);
  });

  it("requires a name and a home-screen name; welcome and announcement are optional", () => {
    const r = parseAppConfig({ ...base(), name: "  ", shortName: "", welcome: "", announcement: "" });
    expect(r.ok ? [] : r.errors.map((e) => e.message)).toEqual(["App name is required.", "Home screen name is required."]);
  });

  it("rejects colours that aren't hex", () => {
    const r = parseAppConfig({ ...base(), accent: "blue", background: "#fff" });
    expect(r.ok ? [] : r.errors.map((e) => e.field)).toEqual(["background", "accent"]);
  });

  it("refuses an accent that doesn't stand out on the background, with a suggestion", () => {
    const r = parseAppConfig({ ...base(), accent: "#fff7c2", background: "#ffffff" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0].field).toBe("accent");
    expect(r.errors[0].message).toMatch(/hard to see on the background \(1\.\d:1, needs 3:1\)\. Try #[0-9a-f]{6}\./);
  });

  it("or, when saving from the builder, shades it until it does and says so", () => {
    const r = parseAppConfig({ ...base(), accent: "#fff7c2", background: "#ffffff" }, { adjust: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.accent).not.toBe("#fff7c2");
    expect(contrast(r.config.accent, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(r.notes[0]).toMatch(/hard to see/);
    // On a dark background it lightens instead.
    const dark = adjustAccent("#202a33", "#101418");
    expect(contrast(dark, "#101418")).toBeGreaterThanOrEqual(3);
  });

  it("always picks text that reads (AA) on any background or accent", () => {
    for (let n = 0; n < 4096; n += 37) {
      const hex = `#${[(n >> 8) & 15, (n >> 4) & 15, n & 15].map((v) => (v * 17).toString(16).padStart(2, "0")).join("")}`;
      expect(contrast(textOn(hex), hex)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("checks the home buttons: known, once each, missing ones added switched off", () => {
    const tiles = [{ id: "menu", on: true }, { id: "order", on: false }];
    const r = parseAppConfig({ ...base(), tiles });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.tiles.slice(0, 2)).toEqual(tiles);
    expect(r.config.tiles).toHaveLength(TILE_IDS.length);
    expect(r.config.tiles.slice(2).every((t) => !t.on)).toBe(true);

    const bad = parseAppConfig({ ...base(), tiles: [{ id: "menu", on: true }, { id: "menu", on: false }, { id: "casino", on: true }] });
    expect(bad.ok ? [] : bad.errors.map((e) => e.message)).toEqual(["Menu is listed twice.", 'There\'s no home button called "casino".']);
  });

  it("allows one letter, number or & as the icon", () => {
    expect(parseAppConfig({ ...base(), icon: { mode: "glyph", glyph: "s" } }).ok).toBe(true);
    expect(parseAppConfig({ ...base(), icon: { mode: "glyph", glyph: "SG" } }).ok).toBe(false);
    expect(parseAppConfig({ ...base(), icon: { mode: "glyph", glyph: "🍕" } }).ok).toBe(false);
  });
});

describe("app tiles", () => {
  it("never shows a button whose feature is off, and says why in the builder", () => {
    const c = base();
    const f = { ...allOn, ordering: false, loyalty: false, instagram: "" };
    const ids = appTiles(c, f, "/s/x").map((t) => t.id);
    expect(ids).not.toContain("order");
    expect(ids).not.toContain("loyalty");
    expect(tileStatus("order", f)).toEqual({ available: false, why: "Online ordering is off" });
    expect(tileStatus("loyalty", f)).toEqual({ available: false, why: "Loyalty is off" });
    expect(tileStatus("call", { ...f, phone: "" }).available).toBe(false);
  });

  it("keeps the owner's order, hides switched-off buttons, and links into the guest pages", () => {
    const c = { ...base(), tiles: [{ id: "call" as const, on: true }, { id: "reserve" as const, on: true }, { id: "menu" as const, on: false }, ...base().tiles.filter((t) => !["call", "reserve", "menu"].includes(t.id))] };
    const tiles = appTiles(c, allOn, "/s/x", "?preview=draft");
    expect(tiles[0]).toMatchObject({ id: "call", href: "tel:9545550100", external: true });
    expect(tiles[1]).toMatchObject({ id: "reserve", href: "/s/x/reserve" });
    expect(tiles.map((t) => t.id)).not.toContain("menu");
    expect(tiles.find((t) => t.id === "hours")?.href).toBe("/s/x/app/visit?preview=draft");
  });
});

describe("manifest and service worker", () => {
  it("describes an installable standalone app scoped to the restaurant's site", () => {
    const m = buildManifest(base(), "/s/santorini");
    expect(m).toMatchObject({
      name: "Santorini by Georgios", short_name: "Santorini", start_url: "/s/santorini/app", scope: "/s/santorini/",
      display: "standalone", theme_color: base().accent, background_color: base().background,
    });
    expect(m.icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual(["192x192 any", "512x512 any", "512x512 maskable"]);
    expect(m.icons.every((i) => i.type === "image/png" && i.src.startsWith("/s/santorini/app/icon-"))).toBe(true);
  });

  it("keeps only the app's pages offline and never a POST, booking, order or token", () => {
    const sw = serviceWorkerSource("/s/santorini", "123");
    expect(sw).toContain('if (req.method !== "GET") return;');
    expect(sw).toContain('const SHELL = [BASE + "/app", BASE + "/app/menu", BASE + "/app/visit", BASE + "/app/more", OFFLINE];');
    for (const never of ["booking", "order", "reserve", "gift-cards", "api", "rewards"]) expect(sw).toContain(never);
    expect(sw).toContain('url.search !== ""');
    expect(() => new Function(sw)).not.toThrow();
  });
});

describe("app levers", () => {
  it("are all confirmed by a person, since guests see them", () => {
    const app = LEVERS.filter((l) => l.pillar === "app");
    expect(app.map((l) => l.key)).toEqual(["app_name", "welcome_line", "announcement", "accent_colour", ...TILE_IDS.map((id) => `tile_${id}`)]);
    expect(app.every((l) => l.risk === "confirm" && l.requires === "manage_venue")).toBe(true);
  });
});

describe("push subscription input", () => {
  const good = { endpoint: "https://fcm.googleapis.com/fcm/send/abc123", keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } };
  it("accepts a browser's subscription, wrapped or bare", () => {
    expect(parsePushSubscription({ subscription: good }).ok).toBe(true);
    expect(parsePushSubscription(good).ok).toBe(true);
  });
  it("rejects anything else", () => {
    expect(parsePushSubscription({ ...good, endpoint: "http://insecure.example/x" }).ok).toBe(false);
    expect(parsePushSubscription({ ...good, endpoint: "javascript:alert(1)" }).ok).toBe(false);
    expect(parsePushSubscription({ ...good, endpoint: `https://x.example/${"a".repeat(1000)}` }).ok).toBe(false);
    expect(parsePushSubscription({ ...good, keys: { p256dh: "short", auth: good.keys.auth } }).ok).toBe(false);
    expect(parsePushSubscription({ ...good, keys: { p256dh: good.keys.p256dh, auth: "<script>alert(1)</script>" } }).ok).toBe(false);
    expect(parsePushSubscription(null).ok).toBe(false);
  });
});

describe("QR codes", () => {
  it("encodes the install link as a square matrix with finder patterns", () => {
    const m = qrMatrix("https://thepass.example/s/santorini/app");
    expect(m.length).toBe(29); // version 3
    expect(m.every((r) => r.length === m.length)).toBe(true);
    // Top-left finder: dark ring, light ring, dark centre.
    expect([m[0][0], m[1][1], m[2][2], m[3][3]]).toEqual([true, false, true, true]);
    expect(qrSvgPath("x").size).toBe(21 + 8);
  });
});
