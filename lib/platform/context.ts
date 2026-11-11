import { notFound, redirect } from "next/navigation";
import { db } from "../db";
import { venuesFor, type VenueSummary } from "../reservations/repo";
import { currentIdentity, tenantFor } from "./session";
import type { Tenant } from "./tenant";

/**
 * Every platform page and action starts here: who is asking, for which
 * restaurant, and may they. A page guard is not an authorization check
 * on its own — actions call this again, because a form post doesn't go
 * through the page.
 */
export async function requireTenant(orgSlug: string): Promise<{
  tenant: Tenant;
  org: { slug: string; name: string };
  venues: VenueSummary[];
  email: string;
  staff: boolean;
}> {
  const sql = db();
  const who = await currentIdentity();
  if (!who) redirect("/login");
  if (!sql) notFound();
  const tenant = await tenantFor(orgSlug);
  // Same answer for "no such restaurant" and "not yours".
  if (!tenant) notFound();
  const [org] = await sql<{ slug: string; name: string }[]>`select slug, name from orgs where id = ${tenant.orgId}`;
  const venues = await venuesFor(sql, tenant);
  return { tenant, org, venues, email: who.email, staff: who.staff };
}
