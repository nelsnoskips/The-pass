import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * Studio login: a magic link, and a session row.
 *
 * No password to leak and nothing to remember. The link is single use —
 * consumed on first verify — so a forwarded or logged email cannot be
 * replayed into a session.
 *
 * Who is allowed in is an allowlist in the environment rather than a
 * users table, because this is a studio of one or two people and a
 * table would be a signup form nobody should ever see.
 */
export const SESSION_COOKIE = "pass-studio";
const SESSION_DAYS = 30;
const LINK_MINUTES = 20;

export function allowedEmails(): string[] {
  return (process.env.STUDIO_ALLOWED_EMAILS ?? process.env.STUDIO_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(email: string) {
  const list = allowedEmails();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

/** Constant-time compare so a token cannot be guessed a byte at a time. */
export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function issueLoginToken(email: string): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  const token = randomBytes(24).toString("base64url");
  await sql`
    insert into login_tokens (token, email, expires_at)
    values (${token}, ${email.toLowerCase()}, now() + ${`${LINK_MINUTES} minutes`}::interval)
  `;
  return token;
}

export async function consumeLoginToken(token: string): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  const rows = await sql<{ email: string }[]>`
    update login_tokens
    set used_at = now()
    where token = ${token}
      and used_at is null
      and expires_at > now()
    returning email
  `;
  return rows.length ? rows[0].email : null;
}

export async function startSession(email: string): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  const token = randomBytes(32).toString("base64url");
  await sql`
    insert into sessions (token, email, expires_at)
    values (${token}, ${email.toLowerCase()}, now() + ${`${SESSION_DAYS} days`}::interval)
  `;
  return token;
}

export async function getSessionEmail(): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await sql<{ email: string }[]>`
    select email from sessions
    where token = ${token} and expires_at > now()
    limit 1
  `;
  return rows.length ? rows[0].email : null;
}

export async function endSession() {
  const sql = db();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (sql && token) await sql`delete from sessions where token = ${token}`;
  store.delete(SESSION_COOKIE);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
