import type { Sql } from "postgres";

/**
 * Who is asking, on behalf of which restaurant group, allowed to do what.
 *
 * Every platform query takes an org_id, and this is the only place one
 * comes from: a signed-in email resolved against org_members (or the
 * studio allowlist, which makes someone staff everywhere). Code that
 * holds a Tenant has already passed the check; code that doesn't, can't
 * reach an org's rows.
 */

export type MemberRole = "owner" | "manager" | "host" | "viewer";
export type TenantRole = MemberRole | "staff";

export interface Tenant {
  orgId: string;
  /** Recorded as the actor in the change log. */
  actor: string;
  role: TenantRole;
  /** null = every venue in the org. */
  venueIds: string[] | null;
}

export type Action =
  | "view"
  | "book" // take and change reservations, seat, mark no-show
  | "manage_venue" // tables, hours, deposits
  | "approve_spend" // agent proposals that move ad money
  | "message_guests" // marketing SMS / email
  | "manage_team"; // who can sign in, and as what

const GRANTS: Record<TenantRole, Action[]> = {
  staff: ["view", "book", "manage_venue", "approve_spend", "message_guests", "manage_team"],
  owner: ["view", "book", "manage_venue", "approve_spend", "message_guests", "manage_team"],
  manager: ["view", "book", "manage_venue", "approve_spend", "message_guests"],
  host: ["view", "book"],
  viewer: ["view"],
};

export function can(t: Tenant, action: Action, venueId?: string): boolean {
  if (!GRANTS[t.role].includes(action)) return false;
  if (venueId && t.venueIds !== null && !t.venueIds.includes(venueId)) return false;
  return true;
}

export class Forbidden extends Error {
  constructor(action: Action) {
    super(`Not allowed: ${action}`);
    this.name = "Forbidden";
  }
}

export function assertCan(t: Tenant, action: Action, venueId?: string): void {
  if (!can(t, action, venueId)) throw new Forbidden(action);
}

/**
 * Resolve an email to a tenant for one org. Returns null when the person
 * has no business in that org — callers render "not found", never a hint
 * that the org exists.
 */
export async function resolveTenant(
  sql: Sql,
  email: string,
  orgSlug: string,
  isStaff: (email: string) => boolean,
): Promise<Tenant | null> {
  const [org] = await sql<{ id: string }[]>`select id from orgs where slug = ${orgSlug}`;
  if (!org) return null;
  const actor = email.trim().toLowerCase();
  if (isStaff(actor)) return { orgId: org.id, actor, role: "staff", venueIds: null };

  const [m] = await sql<{ role: MemberRole; venue_ids: string[] | null }[]>`
    select role, venue_ids from org_members
    where org_id = ${org.id} and lower(email) = ${actor}
  `;
  if (!m) return null;
  return { orgId: org.id, actor, role: m.role, venueIds: m.venue_ids };
}
