import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { handleInboundSms, twilioSignature } from "@/lib/messaging/inbound";

/**
 * STOP and START from a guest's phone, through the real webhook route:
 * signature checked, every restaurant's guest with that phone updated
 * (one shared sending number), recorded as the guest.
 */
const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("SMS opt-out against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  const orgs: string[] = [];
  const phone = `+1555${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  const TOKEN = "test-auth-token";
  const SITE = "https://pass.test";
  let POST: (req: Request) => Promise<Response>;

  const optedOut = async () => (await sql<{ org_id: string; out: boolean }[]>`
    select org_id, sms_opted_out_at is not null as out from guests where org_id = any(${orgs}::uuid[]) and phone = ${phone} order by org_id`)
    .map((r) => r.out);

  const post = (fields: Record<string, string>, sig?: string) => {
    const body = new URLSearchParams(fields);
    const signature = sig ?? twilioSignature(`${SITE}/api/webhooks/twilio`, body.entries(), TOKEN);
    return POST(new Request("http://internal:8888/api/webhooks/twilio", {
      method: "POST", body: body.toString(),
      headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": signature },
    }));
  };

  beforeAll(async () => {
    for (const name of ["Opt A", "Opt B"]) {
      const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values (${name}, ${`opt-${randomUUID().slice(0, 8)}`}) returning id`;
      orgs.push(o.id);
      await sql`insert into guests (org_id, phone, name, sms_consent_at, sms_consent_source) values (${o.id}, ${phone}, 'Pat', now(), 'booking:website')`;
    }
    process.env.DATABASE_URL = url;
    process.env.SITE_URL = SITE;
    process.env.TWILIO_AUTH_TOKEN = TOKEN;
    ({ POST } = await import("@/app/api/webhooks/twilio/route"));
  });
  afterAll(async () => {
    await sql`delete from orgs where id = any(${orgs}::uuid[])`;
    await sql.end();
    await globalThis.__passSql?.end();
  });

  it("rejects a missing or wrong signature and changes nothing", async () => {
    expect((await post({ From: phone, Body: "STOP" }, "")).status).toBe(403);
    expect((await post({ From: phone, Body: "STOP" }, "bm9wZQ==")).status).toBe(403);
    // Signed for a different body: someone replayed the header.
    const other = twilioSignature(`${SITE}/api/webhooks/twilio`, new URLSearchParams({ From: phone, Body: "hello" }).entries(), TOKEN);
    expect((await post({ From: phone, Body: "STOP" }, other)).status).toBe(403);
    expect(await optedOut()).toEqual([false, false]);
  });

  it("STOP opts the phone out at every restaurant, START opts it back in, each logged as the guest", async () => {
    const res = await post({ From: phone, To: "+18005550100", Body: "Stop", MessageSid: "SM1", AccountSid: "AC1" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/xml");
    expect(await res.text()).toBe(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    expect(await optedOut()).toEqual([true, true]);

    // A second STOP changes nothing and logs nothing new.
    expect(await handleInboundSms(sql, phone, "STOP")).toEqual({ handled: "stop", guests: 0 });
    // An ordinary message is ignored.
    expect(await handleInboundSms(sql, phone, "See you Friday!")).toEqual({ handled: "ignored", guests: 0 });

    expect((await post({ From: phone, Body: "START" })).status).toBe(200);
    expect(await optedOut()).toEqual([false, false]);

    const log = await sql<{ org_id: string; actor: string; action: string; detail: { keyword: string; via: string } }[]>`
      select org_id, actor, action, detail from change_log where org_id = any(${orgs}::uuid[]) order by id`;
    expect(log.map((l) => [l.actor, l.action, l.detail.keyword])).toEqual([
      ["guest", "guest.sms_opted_out", "STOP"], ["guest", "guest.sms_opted_out", "STOP"],
      ["guest", "guest.sms_opted_in", "START"], ["guest", "guest.sms_opted_in", "START"],
    ]);
    expect(new Set(log.map((l) => l.org_id))).toEqual(new Set(orgs));
  });

  it("a number written differently still matches", async () => {
    expect(await handleInboundSms(sql, phone.slice(2), "unsubscribe")).toEqual({ handled: "stop", guests: 2 });
    expect(await optedOut()).toEqual([true, true]);
  });
});
