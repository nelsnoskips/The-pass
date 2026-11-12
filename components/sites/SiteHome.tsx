import Link from "next/link";
import { formatPrice, type SiteContent } from "@/lib/sites/content";

/** The Classic theme's home page. Pure: content in, page out. */
export function SiteHome({ content, base, preview = false, ordering = false }: {
  content: SiteContent; base: string; preview?: boolean;
  /** What's taken online, if anything: offered from the hero. */
  ordering?: false | "pickup" | "catering";
}) {
  const c = content;

  // What a search engine or an AI answer needs to say "open till 10,
  // Greek, on Las Olas, book here" without guessing.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: c.brand.name,
    description: c.hero.sub || c.brand.tagline,
    servesCuisine: c.brand.cuisine || undefined,
    priceRange: c.brand.priceRange || undefined,
    telephone: c.contact.phone || undefined,
    email: c.contact.email || undefined,
    address: c.contact.address || undefined,
    image: c.hero.image || undefined,
    acceptsReservations: true,
    potentialAction: {
      "@type": "ReserveAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/reserve` },
      result: { "@type": "FoodEstablishmentReservation", name: "Table reservation" },
    },
    hasMenu: c.menus.map((m) => ({
      "@type": "Menu",
      name: m.name,
      hasMenuSection: m.sections.map((s) => ({
        "@type": "MenuSection",
        name: s.name,
        hasMenuItem: s.items.map((i) => ({
          "@type": "MenuItem",
          name: i.name,
          description: i.description || undefined,
          offers: i.priceCents === null ? undefined : { "@type": "Offer", price: (i.priceCents / 100).toFixed(2), priceCurrency: "USD" },
        })),
      })),
    })),
  };

  return (
    <>
      <section className="site-hero">
        <div className="site-hero-copy">
          <p className="site-eyebrow">{[c.brand.cuisine, c.brand.priceRange].filter(Boolean).join(" · ")}</p>
          <h1>{c.hero.headline}</h1>
          {c.hero.sub && <p className="sub">{c.hero.sub}</p>}
          <div className="site-hero-actions">
            <Link href={`${base}/reserve`} className="site-btn large">Reserve a table</Link>
            {ordering && <Link href={`${base}/order`} className="site-btn large ghost">{ordering === "pickup" ? "Order pickup" : "Order catering"}</Link>}
            {c.menus.length > 0 && <a href="#menu" className="site-btn large ghost">See the menu</a>}
          </div>
        </div>
        <div className="site-hero-image">
          {/* Restaurant-supplied image from any https host, so not next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.hero.image && <img src={c.hero.image} alt="" fetchPriority="high" />}
        </div>
      </section>

      {(c.story.heading || c.story.body) && (
        <section className="site-section">
          <div className="site-wrap site-story">
            <div>
              <p className="site-eyebrow">Our story</p>
              <h2>{c.story.heading}</h2>
            </div>
            <div className="body">
              {c.story.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </section>
      )}

      {c.menus.length > 0 && (
        <section className="site-section" id="menu">
          <div className="site-wrap">
            <p className="site-eyebrow">The menu</p>
            <h2>What we&rsquo;re cooking</h2>
            {c.menus.length > 1 && (
              <nav className="site-menu-tabs" aria-label="Menus">
                {c.menus.map((m) => <a key={m.id} href={`#menu-${m.id}`}>{m.name}</a>)}
              </nav>
            )}
            {c.menus.map((m) => (
              <div key={m.id} className="site-menu" id={`menu-${m.id}`}>
                <h3>{m.name}</h3>
                {m.sections.map((s) => (
                  <div key={s.id} className="site-menu-section">
                    <header>
                      <h4>{s.name}</h4>
                      {s.note && <span>{s.note}</span>}
                    </header>
                    {s.items.map((i) => (
                      <div key={i.id} className="site-item">
                        <div className="line">
                          <span className="name">{i.name}</span>
                          <span className="dots" aria-hidden />
                          <span className="price">{formatPrice(i.priceCents)}</span>
                        </div>
                        {i.description && <p>{i.description}</p>}
                        {i.tags.length > 0 && (
                          <div className="tags">{i.tags.map((t) => <span key={t}>{t}</span>)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="site-section" id="visit">
        <div className="site-wrap site-visit">
          <div>
            <p className="site-eyebrow">Hours</p>
            <h2>When we&rsquo;re open</h2>
            <table className="site-hours">
              <tbody>
                {c.hours.map((h) => (
                  <tr key={h.days}><th scope="row">{h.days}</th><td>{h.hours}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="site-eyebrow">Find us</p>
            <h2>Where we are</h2>
            <div className="site-contact">
              {c.contact.address && (
                <span>
                  {c.contact.mapUrl
                    ? <a href={c.contact.mapUrl} target="_blank" rel="noopener noreferrer">{c.contact.address}</a>
                    : c.contact.address}
                </span>
              )}
              {c.contact.phone && <a href={`tel:${c.contact.phone.replace(/[^\d+]/g, "")}`}>{c.contact.phone}</a>}
              {c.contact.email && <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a>}
              {c.social.instagram && <a href={c.social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
            </div>
          </div>
        </div>
      </section>

      <section className="site-cta">
        <h2>Come for dinner.</h2>
        <p>Book in under a minute. We&rsquo;ll text your confirmation, and you can change or cancel from the same link.</p>
        <Link href={`${base}/reserve`} className="site-btn large">Reserve a table</Link>
      </section>

      {!preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
    </>
  );
}
