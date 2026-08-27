import { NextResponse } from "next/server";
import { isConfigured, sql } from "@/lib/db";
import { mailConfigured, sendMail, studioEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Electronic acceptance of a hosted agreement. The signer types their
 * name — a typed signature with stated intent is a valid electronic
 * signature — and both parties get a copy by email. The database row
 * is the record; the emails are notifications of it.
 */

const AGREEMENTS: Record<string, { title: string; url: string; essentials: string }> = {
  "orravan-agreement": {
    title: "Project Scope & Agreement — Orravan Mechanical × Madison Four",
    url: "https://madisonfour.com/proposals/orravan-agreement",
    essentials:
      "$4,000 total ($2,000 on signing, $2,000 at launch) · nine pages · three integrations · three design concepts with three revision rounds included · optional care plan at $300/month.",
  },
};

const clip = (v: unknown, n = 200) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const slug = clip(payload.slug, 80);
  const name = clip(payload.name);
  const title = clip(payload.title);
  const email = clip(payload.email);
  const authorized = payload.authorized === true;

  const agreement = AGREEMENTS[slug];
  if (!agreement) {
    return NextResponse.json({ error: "Unknown agreement." }, { status: 404 });
  }
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !authorized) {
    return NextResponse.json(
      { error: "Name, a valid email, and the authorization box are required." },
      { status: 400 },
    );
  }

  // Without a database or mail there would be no record of the
  // signature at all — refuse rather than pretend.
  if (!isConfigured() && !mailConfigured()) {
    return NextResponse.json(
      { error: "Signing is temporarily unavailable. Please email your acceptance instead." },
      { status: 503 },
    );
  }

  let recordId: number | null = null;
  if (isConfigured() && sql) {
    try {
      const [row] = await sql`
        insert into agreement_signatures (agreement_slug, signer_name, signer_title, signer_email, user_agent)
        values (${slug}, ${name}, ${title || null}, ${email}, ${req.headers.get("user-agent") ?? null})
        returning id
      `;
      recordId = row.id;
    } catch (err) {
      console.error("[agreement:db]", err);
    }
  }

  const when = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    dateStyle: "long",
    timeStyle: "short",
  });

  // Mail failures must not undo a recorded signature; if the database
  // row exists the signing succeeded whatever the mailer thinks.
  const signerCopy = sendMail({
    to: email,
    subject: `Signed: ${agreement.title}`,
    text: [
      `Hi ${name},`,
      ``,
      `This confirms your electronic signature on the ${agreement.title}, signed ${when} (Pacific).`,
      ``,
      `The agreement as signed: ${agreement.url}`,
      ``,
      `The essentials: ${agreement.essentials}`,
      ``,
      `Nelson will countersign by reply and follow up with the deposit invoice. Questions about any line — just reply to this email.`,
      ``,
      `Madison Four · Torrance, California`,
    ].join("\n"),
  });

  const studioCopy = sendMail({
    to: studioEmail(),
    subject: `✍️ Agreement signed — ${agreement.title}`,
    text: [
      `${name}${title ? `, ${title}` : ""} <${email}> signed "${slug}" at ${when} PT.`,
      recordId ? `Database record #${recordId}.` : `No database record (db not configured) — this email is the record.`,
      ``,
      `Next: countersign by replying to them, then send the deposit invoice.`,
      agreement.url,
    ].join("\n"),
  });

  await Promise.allSettled([signerCopy, studioCopy]);

  return NextResponse.json({ ok: true });
}
