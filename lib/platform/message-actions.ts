"use server";

import { redirect } from "next/navigation";
import { sendGuestSms } from "../agent-runtime/agents/reservations";
import type { AgentContext } from "../agent-runtime/tool";
import { headers } from "next/headers";
import { db } from "../db";
import { integrationsKeyConfigured } from "../integrations/secrets";
import { sendEmailCampaign } from "../messaging/email";
import { requireTenant } from "./context";
import { audienceIds, type Audience } from "./audiences";
import { can } from "./tenant";

/**
 * A campaign written by a person. It goes through the very same tool the
 * agents use — same consent check at send time, same once-a-week cap,
 * same sending hours, same opt-out line — so there is one set of rules
 * for every marketing text, whoever writes it.
 */

export async function sendCampaign(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant } = await requireTenant(org);
  const back = (q: string) => redirect(`/r/${org}/messages?${q}`);
  if (!can(tenant, "message_guests")) back(`err=${encodeURIComponent("Your role can't send campaigns.")}`);

  const audience = String(form.get("audience") ?? "") as Audience;
  if (!["lapsed", "regulars", "everyone"].includes(audience)) back(`err=${encodeURIComponent("Pick who it goes to.")}`);
  const message = String(form.get("message") ?? "").trim();
  const channel = form.get("channel") === "email" ? "email" : "sms";
  const ids = await audienceIds(tenant.orgId, audience, channel);

  if (channel === "email") {
    const subject = String(form.get("subject") ?? "").trim().slice(0, 120);
    if (!subject || message.length < 10) back(`err=${encodeURIComponent("An email needs a subject and a message.")}`);
    if (!integrationsKeyConfigured()) back(`err=${encodeURIComponent("Email campaigns need INTEGRATIONS_KEY set, for the unsubscribe links.")}`);
    const h = await headers();
    const t = await sendEmailCampaign(db()!, {
      orgId: tenant.orgId, actor: tenant.actor, guestIds: ids, subject, body: message.slice(0, 5000),
      baseUrl: `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`,
    });
    const parts = [t.sent && `${t.sent} sent`, t.dry_run && `${t.dry_run} recorded (email isn't switched on yet)`, t.failed && `${t.failed} failed`, t.skipped && `${t.skipped} skipped`].filter(Boolean).join(" · ");
    back(`ok=${encodeURIComponent(parts || "Nobody to email yet.")}`);
  }

  const tool = sendGuestSms();
  const ctx: AgentContext = { sql: db()!, tenant, agentId: "person", runId: null, now: new Date() };
  const input = { guest_ids: ids, message, rationale: `Sent by ${tenant.actor}` };
  const check = await tool.check!(ctx, input, "execute");
  if (!check.ok) back(`err=${encodeURIComponent(check.reason)}`);

  const tally = (await tool.run(ctx, input)) as { sent: number; dry_run: number; failed: number; skipped: number };
  const parts = [
    tally.sent && `${tally.sent} sent`,
    tally.dry_run && `${tally.dry_run} recorded (texting isn't switched on yet)`,
    tally.failed && `${tally.failed} failed`,
    tally.skipped && `${tally.skipped} skipped`,
  ].filter(Boolean).join(" · ");
  back(`ok=${encodeURIComponent(parts || "Nothing to send.")}`);
}
