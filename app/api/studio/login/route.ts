import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { sendMail, mailConfigured } from "@/lib/email";
import { allowedEmails, isAllowed, issueLoginToken } from "@/lib/studio/session";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Studio storage is not configured." }, { status: 503 });
  }
  if (allowedEmails().length === 0) {
    return NextResponse.json(
      { error: "No one is allowed to sign in yet. Set STUDIO_ALLOWED_EMAILS." },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim();

  // Always answer the same way. Telling an unknown address that it is
  // unknown turns this form into a way to enumerate who works here.
  const generic = NextResponse.redirect(siteLink(req, "/studio/login?sent=1"), 303);
  if (!email || !isAllowed(email)) return generic;

  const token = await issueLoginToken(email);
  if (!token) return generic;

  const link = siteLink(req, `/api/studio/verify?token=${token}`).toString();

  if (!mailConfigured()) {
    // Without a mail provider the link would be unreachable, so it goes
    // to the server log — the only person who can read that is already
    // the person signing in.
    console.info(`[studio:login-link] ${link}`);
  }

  await sendMail({
    to: email,
    subject: "Your link to the studio",
    text: `Sign in to The Pass studio:\n\n${link}\n\nThe link works once and expires in 20 minutes.`,
  });

  return generic;
}
