import Link from "next/link";

/**
 * A new restaurant with no venue yet: what happens next and what they
 * can do meanwhile, instead of an empty page.
 */
export function Onboarding({ org, name }: { org: string; name?: string }) {
  const steps = [
    { href: `/r/${org}/settings`, title: "Connect your accounts", body: "Google Business Profile, your point of sale, ad accounts. We'll finish each connection with you." },
    { href: `/r/${org}/settings/team`, title: "Invite your team", body: "Managers and hosts sign in with their own email. Pick what each can do." },
    { href: `/r/${org}/settings/import`, title: "Bring your guest list", body: "Upload a CSV from your old system. Consent comes across with each guest." },
  ];
  return (
    <section className="pf-panel pf-onboard" aria-labelledby="pf-onboard-h">
      <div className="pf-body" style={{ paddingTop: 22 }}>
        <p className="pf-sub" style={{ margin: 0, overflowWrap: "anywhere" }}>Welcome to The Pass{name ? `, ${name}` : ""}.</p>
        <h1 id="pf-onboard-h" className="pf-onboard-h">We&rsquo;re setting up your floor and hours — here&rsquo;s what&rsquo;s next</h1>
        <p className="pf-sub" style={{ margin: 0, maxWidth: "62ch" }}>
          The Pass team is adding your dining room: tables, service hours and booking rules. When that&rsquo;s done, your host stand, bookings and this page fill in. Meanwhile:
        </p>
        <ol className="pf-steps">
          {steps.map((s, i) => (
            <li key={s.href}>
              <Link href={s.href}>
                <span className="n mono" aria-hidden>{i + 1}</span>
                <span><b>{s.title}</b><span className="pf-sub" style={{ display: "block", margin: "2px 0 0" }}>{s.body}</span></span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
