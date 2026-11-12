import { AppScreen } from "@/components/app/AppPage";
import { loadAppPage } from "@/components/app/load";
import { describeAvailability, formatPrice } from "@/lib/sites/content";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string }>; searchParams: Promise<{ preview?: string }> };

/** The website's menu in the app, readable offline once opened. */
export default async function AppMenu({ params, searchParams }: Props) {
  const [{ site }, { preview }] = await Promise.all([params, searchParams]);
  const app = await loadAppPage(site, preview);
  const menus = app.site.content.menus;
  return (
    <AppScreen app={app} tab="page" title="Menu">
      {menus.length === 0 && <p>The menu is coming soon.</p>}
      {menus.length > 1 && (
        <nav className="papp-chips" aria-label="Menus">
          {menus.map((m) => <a key={m.id} href={`#menu-${m.id}`}>{m.name}</a>)}
        </nav>
      )}
      {menus.map((m) => (
        <section key={m.id} id={`menu-${m.id}`} className="papp-menu">
          <h2>{m.name}</h2>
          {m.availability && <p className="papp-note">{describeAvailability(m.availability)}</p>}
          {m.sections.map((s) => (
            <div key={s.id} className="papp-menu-section">
              <h3>{s.name}</h3>
              {s.note && <p className="papp-note">{s.note}</p>}
              <ul>
                {s.items.map((i) => (
                  <li key={i.id}>
                    <span className="n">{i.name}</span>
                    <span className="p">{i.priceCents === null ? "Market price" : `$${formatPrice(i.priceCents)}`}</span>
                    {i.description && <span className="d">{i.description}</span>}
                    {i.tags.length > 0 && <span className="d">{i.tags.join(" · ")}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </AppScreen>
  );
}
