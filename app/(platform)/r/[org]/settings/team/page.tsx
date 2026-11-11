import { SettingsNav } from "@/components/platform/SettingsNav";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { listMembers } from "@/lib/platform/settings";
import { addMemberAction, removeMemberAction } from "@/lib/platform/settings-actions";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const ROLES = [
  { id: "owner", what: "Everything, including the team and spend." },
  { id: "manager", what: "Runs the restaurant: bookings, website, guests, approvals." },
  { id: "host", what: "The host stand: bookings, seating, walk-ins." },
  { id: "viewer", what: "Can look, can't change anything." },
];

export default async function Team({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, email } = await requireTenant(org);
  const members = await listMembers(db()!, tenant);
  const manage = can(tenant, "manage_team");

  return (
    <>
      <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">Who can sign in to this restaurant, and what they can do.</p></div></div>
      <SettingsNav org={org} ok={q.ok} err={q.err} />
      <div className="pf-layout">
        <section className="pf-panel pf-scroll">
          <h2>Team · {members.length}</h2>
          <table className="pf-table">
            <thead><tr><th>Email</th><th>Role</th><th /></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.email}{m.email.toLowerCase() === email.toLowerCase() && <span className="pf-pill" style={{ marginLeft: 8 }}>You</span>}</td>
                  <td><span className="pf-pill">{m.role}</span></td>
                  <td style={{ textAlign: "right" }}>
                    {manage && (
                      <form action={removeMemberAction}>
                        <input type="hidden" name="org" value={org} />
                        <input type="hidden" name="member" value={m.id} />
                        <button className="pf-btn small quiet">Remove</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {manage && (
          <aside className="pf-sticky">
            <section className="pf-panel">
              <h2>Add someone</h2>
              <form action={addMemberAction} className="pf-body">
                <input type="hidden" name="org" value={org} />
                <div className="pf-field"><label htmlFor="tm-email">Email</label><input id="tm-email" name="email" type="email" required /></div>
                <fieldset className="pf-field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="pf-sub" style={{ marginBottom: 6 }}>Role</legend>
                  {ROLES.map((r) => (
                    <label key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, marginBottom: 6 }}>
                      <input type="radio" name="role" value={r.id} defaultChecked={r.id === "host"} style={{ marginTop: 3 }} />
                      <span><b style={{ textTransform: "capitalize" }}>{r.id}</b> <span className="pf-sub">— {r.what}</span></span>
                    </label>
                  ))}
                </fieldset>
                <button className="pf-btn primary">Add to team</button>
                <p className="pf-sub" style={{ margin: 0 }}>They sign in at /login with this email. No password.</p>
              </form>
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
