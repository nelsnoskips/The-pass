import Link from "next/link";
import { AppScreen } from "@/components/app/AppPage";
import { ShareIcon } from "@/components/app/InstallPrompt";
import { loadAppPage } from "@/components/app/load";
import { PushToggle } from "@/components/app/PushToggle";
import { vapidPublicKey } from "@/lib/app/push";
import { telHref } from "@/lib/sites/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string }>; searchParams: Promise<{ preview?: string }> };

export default async function More({ params, searchParams }: Props) {
  const [{ site }, { preview }] = await Promise.all([params, searchParams]);
  const app = await loadAppPage(site, preview);
  const f = app.features;
  const links = [
    { href: `${app.base}/app/visit${app.q}`, label: "Hours & location", internal: true, show: f.hours },
    { href: `${app.base}/app/menu${app.q}`, label: "Menu", internal: true, show: f.menu },
    { href: `${app.base}/gift-cards`, label: f.giftCardsOnline ? "Gift cards" : "Gift cards (at the restaurant)", internal: true, show: true },
    { href: telHref(f.phone), label: `Call ${f.phone}`, internal: false, show: Boolean(f.phone) },
    { href: f.instagram, label: "Instagram", internal: false, show: Boolean(f.instagram) },
    { href: app.base, label: "Our website", internal: true, show: true },
  ].filter((l) => l.show);

  return (
    <AppScreen app={app} tab="more" title="More">
      <section className="papp-card">
        <PushToggle slug={app.site.slug} vapidKey={vapidPublicKey()} preview={app.draft} />
      </section>
      <ul className="papp-list">
        {links.map((l) => (
          <li key={l.href}>
            {l.internal
              ? <Link href={l.href} prefetch={false}>{l.label}</Link>
              : <a href={l.href} {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{l.label}</a>}
          </li>
        ))}
      </ul>
      <section className="papp-card">
        <h2>Put the app on your home screen</h2>
        <p><b>iPhone:</b> in Safari, tap <ShareIcon /> Share, then <b>Add to Home Screen</b>.</p>
        <p><b>Android:</b> in Chrome, tap the menu (⋮), then <b>Install app</b> or <b>Add to Home screen</b>.</p>
      </section>
    </AppScreen>
  );
}
