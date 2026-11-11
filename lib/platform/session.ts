import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "../db";
import { getSessionEmail, isAllowed } from "../studio/session";
import { resolveTenant, type Tenant } from "./tenant";

/**
 * Restaurant sign-in: a magic link for anyone listed in org_members.
 * Its own tables and its own cookie, so a restaurant session can never
 * be mistaken for a studio one. Studio staff don't need one: their
 * studio session makes them staff in every restaurant.
 */

import { MEMBER_COOKIE } from "./cookie";
export { MEMBER_COOKIE };
const SESSION_DAYS = 30;
const LINK_MINUTES = 20;

export async function isMember(email: string): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  const rows = await sql`select 1 from org_members where lower(email) = ${email.trim().toLowerCase()} limit 1`;
  return rows.length > 0;
}

export async function issueMemberToken(email: string): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  const token = randomBytes(24).toString("base64url");
  await sql`insert into member_login_tokens (token, email, expires_at)
            values (${token}, ${email.trim().toLowerCase()}, now() + ${`${LINK_MINUTES} minutes`}::interval)`;
  return token;
}

/** Single use: a forwarded link can't be replayed into a session. */
export async function consumeMemberToken(token: string): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  const rows = await sql<{ email: string }[]>`
    update member_login_tokens set used_at = now()
    where token = ${token} and used_at is null and expires_at > now()
    returning email`;
  return rows.length ? rows[0].email : null;
}

export async function startMemberSession(email: string): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  const token = randomBytes(32).toString("base64url");
  await sql`insert into member_sessions (token, email, expires_at)
            values (${token}, ${email}, now() + ${`${SESSION_DAYS} days`}::interval)`;
  return token;
}

export const memberCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

async function memberEmail(): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  const rows = await sql<{ email: string }[]>`
    select email from member_sessions where token = ${token} and expires_at > now() limit 1`;
  return rows.length ? rows[0].email : null;
}

export async function endMemberSession() {
  const sql = db();
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (sql && token) await sql`delete from member_sessions where token = ${token}`;
  store.delete(MEMBER_COOKIE);
}

/** Who is signed in, either way. `staff` means via the studio. */
export async function currentIdentity(): Promise<{ email: string; staff: boolean } | null> {
  const studio = await getSessionEmail();
  if (studio && isAllowed(studio)) return { email: studio, staff: true };
  const member = await memberEmail();
  return member ? { email: member, staff: false } : null;
}

/** The signed-in person's tenant for one org, or null if they have none. */
export async function tenantFor(orgSlug: string): Promise<Tenant | null> {
  const sql = db();
  const who = await currentIdentity();
  if (!sql || !who) return null;
  return resolveTenant(sql, who.email, orgSlug, () => who.staff);
}

/** Orgs the signed-in person can open. */
export async function myOrgs(): Promise<{ slug: string; name: string }[]> {
  const sql = db();
  const who = await currentIdentity();
  if (!sql || !who) return [];
  if (who.staff) return sql<{ slug: string; name: string }[]>`select slug, name from orgs order by name`;
  return sql<{ slug: string; name: string }[]>`
    select o.slug, o.name from orgs o join org_members m on m.org_id = o.id
    where lower(m.email) = ${who.email.toLowerCase()} order by o.name`;
}
