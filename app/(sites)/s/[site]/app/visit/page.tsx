import { AppScreen } from "@/components/app/AppPage";
import { loadAppPage } from "@/components/app/load";
import { mapHref, telHref } from "@/lib/sites/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string }>; searchParams: Promise<{ preview?: string }> };

/** Hours and how to find the restaurant, readable offline once opened. */
export default async function Visit({ params, searchParams }: Props) {
  const [{ site }, { preview }] = await Promise.all([params, searchParams]);
  const app = await loadAppPage(site, preview);
  const c = app.site.content;
  const phone = app.features.phone;
  return (
    <AppScreen app={app} tab="page" title="Hours & location">
      {c.hours.length > 0 && (
        <table className="papp-hours">
          <caption className="papp-eyebrow">Hours</caption>
          <tbody>
            {c.hours.map((h) => <tr key={h.days}><th scope="row">{h.days}</th><td>{h.hours}</td></tr>)}
          </tbody>
        </table>
      )}
      {c.contact.address && (
        <div className="papp-card">
          <p className="papp-eyebrow">Find us</p>
          <p>{c.contact.address}</p>
          <a className="papp-btn" href={mapHref(c.contact.address, c.contact.mapUrl)} target="_blank" rel="noopener noreferrer">Directions</a>
        </div>
      )}
      {phone && <a className="papp-btn ghost wide" href={telHref(phone)}>Call {phone}</a>}
    </AppScreen>
  );
}
