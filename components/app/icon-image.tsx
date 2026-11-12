import { ImageResponse } from "next/og";
import { iconText, textOn } from "@/lib/app/config";
import { loadGuestApp } from "@/lib/app/repo";
import { db } from "@/lib/db";

/**
 * The app's home-screen icon as a PNG, drawn from the published config:
 * initials (or the owner's chosen character) on the accent colour. Full
 * bleed, so iOS and Android round the corners themselves; the maskable
 * version keeps the letters inside the safe zone.
 */
export async function appIconResponse(slug: string, size: number, maskable = false): Promise<Response> {
  const sql = db();
  const app = sql ? await loadGuestApp(sql, slug) : null;
  if (!app) return new Response("Not found", { status: 404 });
  const text = iconText(app.config);
  const scale = (text.length > 1 ? 0.42 : 0.56) * (maskable ? 0.8 : 1);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: app.config.accent, color: textOn(app.config.accent), fontSize: Math.round(size * scale), fontWeight: 700, letterSpacing: text.length > 1 ? "-0.02em" : 0 }}>
        {text}
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=300, stale-while-revalidate=86400" } },
  );
}
