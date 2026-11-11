import { Importer } from "@/components/platform/Importer";
import { SettingsNav } from "@/components/platform/SettingsNav";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

export default async function Import({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const { tenant } = await requireTenant(org);
  return (
    <>
      <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">Bring your guests and bookings from OpenTable, Resy, SevenRooms or a spreadsheet.</p></div></div>
      <SettingsNav org={org} />
      <section className="pf-panel" style={{ maxWidth: 760 }}>
        <h2>Import</h2>
        {can(tenant, "manage_venue") ? <Importer org={org} /> : <p className="pf-empty">Only owners and managers can import.</p>}
      </section>
    </>
  );
}
