import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { SiteContent } from "@/lib/sites/content";
import { readableOn, telHref } from "@/lib/sites/format";
import { siteBody, siteDisplay } from "./fonts";
import { OfflineNotice, SiteMenu, type SiteLink } from "./SiteMenu";

/** The Classic theme's frame: announcement, header, footer. */
export function SiteShell({ content, base, children, banner, ordering = false, giftCardsOnline = false, giftCards = true }: {
  content: SiteContent; base: string; children: ReactNode; banner?: ReactNode; ordering?: boolean;
  /** The restaurant's plan includes gift cards; without them there's no gift card page to link to. */
  giftCards?: boolean;
  /** Gift cards can be bought on the site (a card processor is set up). */
  giftCardsOnline?: boolean;
}) {
  const display = siteDisplay;
  const body = siteBody;
  const vars = {
    "--paper": content.theme.paper,
    "--ink": content.theme.ink,
    "--accent": content.theme.accent,
    "--on-accent": readableOn(content.theme.accent),
  } as CSSProperties;

  // The same places on every width; phones get them behind a button.
  const links: SiteLink[] = [
    ...(content.menus.length > 0 ? [{ href: `${base}#menu`, label: "Menu" }] : []),
    ...(ordering ? [{ href: `${base}/order`, label: "Order online" }] : []),
    ...(giftCards ? [{ href: `${base}/gift-cards`, label: giftCardsOnline ? "Gift cards" : "Gift cards (at the restaurant)" }] : []),
    { href: `${base}#visit`, label: "Hours & location" },
  ];
  const phone = content.contact.phone;

  return (
    <div className={`site ${display.variable} ${body.variable}`} style={vars}>
      <a href="#main" className="site-skip">Skip to content</a>
      {banner}
      {content.announcement && <p className="site-announce">{content.announcement}</p>}
      <header className="site-header">
        <div className="site-wrap">
          <Link href={base} className="site-brand">{content.brand.name}</Link>
          <nav className="site-nav" aria-label="Site">
            <span className="site-links">
              {content.menus.length > 0 && <Link href={`${base}#menu`}>Menu</Link>}
              <Link href={`${base}#visit`}>Hours &amp; Location</Link>
              {ordering && <Link href={`${base}/order`}>Order online</Link>}
              {giftCards && <Link href={`${base}/gift-cards`}>Gift cards</Link>}
            </span>
            <SiteMenu links={[...links, ...(phone ? [{ href: telHref(phone), label: `Call ${phone}`, external: true }] : [])]} />
            <Link href={`${base}/reserve`} className="site-btn">Reserve</Link>
          </nav>
        </div>
      </header>
      <OfflineNotice />
      <main id="main" tabIndex={-1}>{children}</main>
      <footer className="site-footer">
        <div className="site-wrap">
          <span>© {new Date().getFullYear()} {content.brand.name}</span>
          {phone && <a href={telHref(phone)}>{phone}</a>}
          <span>Bookings by The Pass</span>
        </div>
      </footer>
    </div>
  );
}
