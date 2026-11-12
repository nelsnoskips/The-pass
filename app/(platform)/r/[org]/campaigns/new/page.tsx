import { planLock } from "@/components/platform/NotInPlan";
import Link from "next/link";
import { CampaignComposer, type ComposerSegment } from "@/components/platform/CampaignComposer";
import { db } from "@/lib/db";
import { saveCampaignAction } from "@/lib/marketing/actions";
import { getCampaign, reach } from "@/lib/marketing/campaigns";
import { describeRules, listSegments } from "@/lib/marketing/segments";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

export default async function NewCampaign({ params, searchParams }: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ segment?: string; edit?: string; err?: string }>;
}) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant } = await requireTenant(org);
  const locked = await planLock(org, tenant, "campaigns", { back: `/r/${org}/campaigns` });
  if (locked) return locked;
  const sql = db()!;
  const back = <p className="pf-sub" style={{ margin: "0 0 6px" }}><Link href={`/r/${org}/campaigns`}>Campaigns</Link></p>;
  if (!can(tenant, "message_guests")) {
    return (
      <>
        <div className="pf-head"><div>{back}<h1>New campaign</h1></div></div>
        <section className="pf-panel"><p className="pf-empty">Your role can&rsquo;t write campaigns. An owner or manager can.</p></section>
      </>
    );
  }
  const editing = q.edit ? await getCampaign(sql, tenant, q.edit) : null;
  const now = new Date();
  const segments: ComposerSegment[] = await Promise.all((await listSegments(sql, tenant)).map(async (s) => {
    const [sms, email] = await Promise.all([reach(sql, tenant, s.id, "sms", now), reach(sql, tenant, s.id, "email", now)]);
    return {
      id: s.id, name: s.name, description: describeRules(s.rules), members: sms?.members ?? 0,
      sms: { consented: sms?.consented ?? 0, recipients: sms?.recipients.length ?? 0 },
      email: { consented: email?.consented ?? 0, recipients: email?.recipients.length ?? 0 },
    };
  }));
  const initial = editing && editing.status === "draft"
    ? { id: editing.id, name: editing.name, channel: editing.channel, segment: editing.segment, subject: editing.subject ?? "", body: editing.body }
    : { name: "", channel: "sms" as const, segment: segments.some((s) => s.id === q.segment) ? q.segment! : "lapsed", subject: "", body: "" };

  return (
    <>
      <div className="pf-head">
        <div>
          {back}
          <h1>{editing ? `Edit “${editing.name}”` : "New campaign"}</h1>
          <p className="pf-sub">A text or an email to one segment. Only guests who said yes to that channel get it, and nobody gets more than one campaign a week.</p>
        </div>
      </div>
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      {editing && editing.status !== "draft" ? (
        <section className="pf-panel"><p className="pf-empty">Only a draft can be edited. <Link href={`/r/${org}/campaigns/${editing.id}`}>Back to the campaign</Link></p></section>
      ) : (
        <section className="pf-panel" style={{ maxWidth: 720 }}>
          <h2>{editing ? "Draft" : "Write it"}</h2>
          <CampaignComposer org={org} action={saveCampaignAction} segments={segments} initial={initial} />
        </section>
      )}
    </>
  );
}
