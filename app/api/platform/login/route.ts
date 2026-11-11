import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/email";
import { allow, clientAddress } from "@/lib/platform/ratelimit";
import { isMember, issueMemberToken } from "@/lib/platform/session";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Restaurant staff sign-in. Always answers the same way, so the form
 * can't be used to find out who works where.
 */
export async function POST(req: Request) {
  const generic = NextResponse.redirect(siteLink(req, "/login?sent=1"), 303);
  const sql = db();
  if (!sql) return generic;

  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim().toLowerCase();
  if (!email || email.length > 200) return generic;
  if (!(await allow(sql, "login-ip", clientAddress(req.headers), 10, 15))) return generic;
  if (!(await allow(sql, "login-email", email, 5, 15))) return generic;
  if (!(await isMember(email))) return generic;

  const token = await issueMemberToken(email);
  if (!token) return generic;
  const link = siteLink(req, `/api/platform/verify?token=${token}`).toString();
  if (!mailConfigured()) console.info(`[platform:login-link] ${link}`);
  await sendMail({
    to: email,
    subject: "Your sign-in link for The Pass",
    text: `Sign in to The Pass:\n\n${link}\n\nThe link works once and expires in 20 minutes. If you didn't ask for it, ignore this email.`,
  });
  return generic;
}
