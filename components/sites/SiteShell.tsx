import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { SiteContent } from "@/lib/sites/content";
import { readableOn } from "@/lib/sites/format";
import { siteBody, siteDisplay } from "./fonts";

/** The Classic theme's frame: announcement, header, footer. */
export function SiteShell({ content, base, children, banner }: { content: SiteContent; base: string; children: ReactNode; banner?: ReactNode }) {
  const display = siteDisplay;
  const body = siteBody;
  const vars = {
    "--paper": content.theme.paper,
    "--ink": content.theme.ink,
    "--accent": content.theme.accent,
    "--on-accent": readableOn(content.theme.accent),
  } as CSSProperties;

  return (
    <div className={`site ${display.variable} ${body.variable}`} style={vars}>
      {banner}
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
