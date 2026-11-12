import Link from "next/link";
import { AppScreen } from "@/components/app/AppPage";
import { loadAppPage } from "@/components/app/load";

type Props = { params: Promise<{ site: string }> };

/** What the service worker shows for a page it can't fetch and hasn't kept. */
export default async function Offline({ params }: Props) {
  const { site } = await params;
  const app = await loadAppPage(site);
  return (
    <AppScreen app={app} tab="page" title="You're offline">
      <p>That page needs a connection. Booking and ordering work again as soon as you&rsquo;re back online.</p>
      <p>These still work without one:</p>
      <ul className="papp-list">
        <li><Link href={`${app.base}/app`}>Home</Link></li>
        {app.features.menu && <li><Link href={`${app.base}/app/menu`}>Menu</Link></li>}
        {app.features.hours && <li><Link href={`${app.base}/app/visit`}>Hours &amp; location</Link></li>}
      </ul>
    </AppScreen>
  );
}
