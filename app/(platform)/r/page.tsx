import Link from "next/link";
import { redirect } from "next/navigation";
import { currentIdentity, myOrgs } from "@/lib/platform/session";

export const dynamic = "force-dynamic";

/** Where sign-in lands: straight into the one restaurant, or a choice. */
export default async function PickOrg() {
  if (!(await currentIdentity())) redirect("/login");
  const orgs = await myOrgs();
  if (orgs.length === 1) redirect(`/r/${orgs[0].slug}`);
  return (
    <main className="pf-login">
      <div className="pf-login-card">
        <h1>Choose a restaurant</h1>
        {orgs.length === 0 ? (
          <p className="pf-sub">Your account isn&rsquo;t on any restaurant&rsquo;s team yet. Ask the owner to add you.</p>
        ) : (
          orgs.map((o) => <Link key={o.slug} href={`/r/${o.slug}`} className="pf-btn">{o.name}</Link>)
        )}
      </div>
    </main>
  );
}
