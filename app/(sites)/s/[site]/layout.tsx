import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import { db } from "@/lib/db";
import { readableOn } from "@/lib/sites/format";
import { getPublishedSite } from "@/lib/sites/repo";
import "../../sites.css";

/* The Classic theme's pairing, scoped to restaurant sites so no other
   part of the app preloads it. */
const display = Fraunces({ variable: "--font-site-display", subsets: ["latin"], display: "swap" });
const body = Hanken_Grotesk({ variable: "--font-site-body", subsets: ["latin"], display: "swap" });

// Content is per-restaurant and changes on publish.
export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ site: string }>;
}) {
  const { site: slug } = await params;
  const sql = db();
  const site = sql ? await getPublishedSite(sql, slug) : null;
  if (!site) notFound();
  const { content } = site;
  const base = `/s/${site.slug}`;

  const vars = {
    "--paper": content.theme.paper,
    "--ink": content.theme.ink,
    "--accent": content.theme.accent,
    "--on-accent": readableOn(content.theme.accent),
  } as CSSProperties;

  return (
    <div className={`site ${display.variable} ${body.variable}`} style={vars}>
      {content.announcement && <p className="site-announce">{content.announcement}</p>}
      <header className="site-header">
        <div className="site-wrap">
          <Link href={base} className="site-brand">{content.brand.name}</Link>
          <nav className="site-nav" aria-label="Site">
            <span className="site-links">
              {content.menus.length > 0 && <Link href={`${base}#menu`}>Menu</Link>}
              <Link href={`${base}#visit`}>Hours &amp; Location</Link>
            </span>
            <Link href={`${base}/reserve`} className="site-btn">Reserve</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-wrap">
          <span>© {new Date().getFullYear()} {content.brand.name}</span>
          <span>Bookings by The Pass</span>
        </div>
      </footer>
    </div>
  );
}
