import type { Metadata, Viewport } from "next";
import { loadGuestApp } from "@/lib/app/repo";
import { db } from "@/lib/db";

type Params = { params: Promise<{ site: string }> };

async function published(params: Params["params"]) {
  const { site } = await params;
  const sql = db();
  return sql ? loadGuestApp(sql, site) : null;
}

/** What makes the page installable: the manifest, the home-screen icon, and its name on iPhone. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const app = await published(params);
  if (!app) return { robots: { index: false, follow: false } };
  const base = `/s/${app.site.slug}`;
  return {
    title: app.config.name,
    description: app.config.welcome || undefined,
    manifest: `${base}/app/manifest.webmanifest`,
    icons: { icon: [{ url: `${base}/app/icon-192.png`, type: "image/png", sizes: "192x192" }], apple: [{ url: `${base}/app/apple-touch-icon.png`, sizes: "180x180" }] },
    appleWebApp: { capable: true, title: app.config.shortName, statusBarStyle: "default" },
    other: { "mobile-web-app-capable": "yes" },
  };
}

export async function generateViewport({ params }: Params): Promise<Viewport> {
  const app = await published(params);
  return { themeColor: app?.config.accent, width: "device-width", initialScale: 1, viewportFit: "cover" };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
