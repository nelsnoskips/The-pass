import { createHash } from "node:crypto";
import type { Sql } from "postgres";

/**
 * A small sliding-window limiter in Postgres. Good for the handful of
 * public writes we have (bookings, sign-in links); it is not a DDoS
 * shield, which is the CDN's job.
 */
export async function allow(
  sql: Sql,
  scope: string,
  subject: string,
  limit: number,
  windowMinutes: number,
): Promise<boolean> {
  const key = `${scope}:${createHash("sha256").update(subject).digest("hex").slice(0, 32)}`;
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from rate_events where key = ${key} and created_at > ${since}`;
  if (n >= limit) return false;
  await sql`insert into rate_events (key) values (${key})`;
  // Opportunistic tidy-up so the table never needs a cron.
  if (Math.random() < 0.02) await sql`delete from rate_events where created_at < now() - interval '1 day'`;
  return true;
}

/** The caller's network address, as the CDN reports it. */
export function clientAddress(h: Headers): string {
  return (
    h.get("x-nf-client-connection-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
