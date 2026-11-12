import { headers } from "next/headers";
import { AppBuilder } from "@/components/platform/AppBuilder";
import { CopyLink } from "@/components/platform/CopyLink";
import { PillarLevers } from "@/components/platform/PillarLevers";
import { QrCode } from "@/components/platform/QrCode";
import { TILE_IDS, tileStatus } from "@/lib/app/config";
import { pushSubscriberCount, vapidPublicKey } from "@/lib/app/push";
import { appFeatures, getAppState } from "@/lib/app/repo";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { formatIn, venueTz } from "@/lib/platform/when";

export const dynamic = "force-dynamic";

/** The restaurant's own app: build it, preview it on a phone, publish, and share the install link. */
export default async function AppPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const { tenant, venues } = await requireTenant(slug);
  const tz = venueTz(venues);
  const sql = db()!;
  const state = await getAppState(sql, tenant);
  const site = state.site;
  if (!site) {
    return (
      <>
        <div className="pf-head"><div><h1>App</h1></div></div>
        <p className="pf-empty pf-panel">Your app is built on your website, and the website isn&rsquo;t live yet. Publish it from <a href={`/r/${slug}/website`}>Website</a> first.</p>
      </>
    );
  }
  const [features, subscribers] = await Promise.all([appFeatures(sql, site), pushSubscriberCount(sql, tenant)]);
  const tiles = Object.fromEntries(TILE_IDS.map((id) => [id, tileStatus(id, features)])) as Record<(typeof TILE_IDS)[number], ReturnType<typeof tileStatus>>;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`;
  const appUrl = `${origin}/s/${site.slug}/app`;
  const editable = can(tenant, "manage_venue");
  const pushReady = Boolean(vapidPublicKey());

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>App</h1>
          <p className="pf-sub">
            Your own app on guests&rsquo; home screens: order, book, rewards. No app store needed.{" "}
            {state.published
              ? <>Published {formatIn(state.publishedAt!, tz, "datetime")}{state.unpublished ? " · You have unpublished changes" : ""}</>
              : "Not published yet: guests can't open it until you publish."}
          </p>
        </div>
      </div>
      <PillarLevers pillar="app" org={slug} tenant={tenant} />
      {editable ? (
        <AppBuilder
          org={slug} slug={site.slug} initial={state.draft} published={state.published} tiles={tiles}
          siteAnnouncement={site.content.announcement.slice(0, 240)}
          siteColours={{ accent: site.content.theme.accent, background: site.content.theme.paper }}
        />
      ) : (
        <p className="pf-empty pf-panel">Only owners and managers can change the app.</p>
      )}

      <div className="pf-appb-extra">
        <section className="pf-panel" aria-labelledby="install-h">
          <h2 id="install-h">Install link</h2>
          <div className="pf-body pf-appb-install">
            {state.published ? (
              <>
                <QrCode value={appUrl} label={`QR code for ${appUrl}`} />
                <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                  <p className="pf-sub" style={{ margin: 0 }}>Print it on receipts and table cards, or text the link. Guests open it and add it to their home screen.</p>
                  <CopyLink url={appUrl} />
                  <h3 className="pf-flabel" style={{ margin: "6px 0 0" }}>How guests install it</h3>
                  <ul className="pf-appb-steps">
                    <li><b>iPhone:</b> open the link in Safari, tap Share, then <b>Add to Home Screen</b>.</li>
                    <li><b>Android:</b> open the link in Chrome and tap <b>Install app</b> (or menu ⋮ → Install app).</li>
                  </ul>
                </div>
              </>
            ) : (
              <p className="pf-sub" style={{ margin: 0 }}>Publish the app to get its link and QR code.</p>
            )}
          </div>
        </section>
        <section className="pf-panel" aria-labelledby="updates-h">
          <h2 id="updates-h">Updates</h2>
          <div className="pf-body">
            <p style={{ margin: 0 }}><b className="pf-appb-stat">{pushReady ? subscribers : "—"}</b> {pushReady ? (subscribers === 1 ? "guest has turned on updates" : "guests have turned on updates") : "guests with updates on (switches on with push)"}</p>
            <label className="pf-field">
              <span className="pf-flabel">Send a notification</span>
              <textarea className="pf-input" rows={2} disabled placeholder="Tonight only: lamb kleftiko is back." aria-describedby="push-off" />
            </label>
            <button type="button" className="pf-btn" disabled>Send</button>
            <p id="push-off" className="pf-sub" style={{ margin: 0 }}>
              {pushReady
                ? "Sending is coming next. Guests who turn on updates now will get the first one."
                : "Notifications switch on once push keys are added to The Pass. Until then the app's Get updates switch says they're coming soon and nothing is stored."}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
