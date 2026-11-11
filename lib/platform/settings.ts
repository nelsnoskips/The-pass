import type { Sql } from "postgres";
import { provider, type ProviderId } from "../integrations/registry";
import { log } from "../reservations/repo";
import { assertCan, type MemberRole, type Tenant } from "./tenant";

/**
 * A restaurant's settings: who's on the team, the floor and service
 * hours, booking rules, and connections to outside services. Every
 * write is permission-checked here and recorded in the change log.
 */

/* ------------------------------------------------------------- team -- */

export interface Member { id: string; email: string; role: MemberRole; venueIds: string[] | null }

export async function listMembers(sql: Sql, t: Tenant): Promise<Member[]> {
  assertCan(t, "view");
  const rows = await sql<{ id: string; email: string; role: MemberRole; venue_ids: string[] | null }[]>`
    select id, email, role, venue_ids from org_members where org_id = ${t.orgId} order by role, email`;
  return rows.map((r) => ({ id: r.id, email: r.email, role: r.role, venueIds: r.venue_ids }));
}

const ROLES: MemberRole[] = ["owner", "manager", "host", "viewer"];

export async function addMember(sql: Sql, t: Tenant, email: string, role: string): Promise<string | null> {
  assertCan(t, "manage_team");
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) return "That email doesn't look right.";
  if (!ROLES.includes(role as MemberRole)) return "Pick a role.";
  await sql`insert into org_members (org_id, email, role) values (${t.orgId}, ${e}, ${role})
            on conflict (org_id, email) do update set role = excluded.role`;
  await log(sql, t.orgId, t.actor, "team.member_set", "org_member", e, { role });
  return null;
}

export async function removeMember(sql: Sql, t: Tenant, memberId: string): Promise<string | null> {
  assertCan(t, "manage_team");
  return sql.begin(async (tx) => {
    const [m] = await tx<{ email: string; role: MemberRole }[]>`
      select email, role from org_members where id = ${memberId} and org_id = ${t.orgId} for update`;
    if (!m) return "Not found.";
    if (m.role === "owner") {
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from org_members where org_id = ${t.orgId} and role = 'owner'`;
      if (n <= 1) return "A restaurant needs at least one owner.";
    }
    await tx`delete from org_members where id = ${memberId} and org_id = ${t.orgId}`;
    await tx`delete from member_sessions where lower(email) = ${m.email.toLowerCase()}
             and not exists (select 1 from org_members where lower(email) = ${m.email.toLowerCase()})`;
    await log(tx, t.orgId, t.actor, "team.member_removed", "org_member", m.email);
    return null;
  });
}

/* ------------------------------------------------------------ floor -- */

export interface TableRow { id: string; label: string; area: string | null; minCovers: number; maxCovers: number; online: boolean; active: boolean }

export async function listTables(sql: Sql, t: Tenant, venueId: string): Promise<TableRow[]> {
  assertCan(t, "view", venueId);
  const rows = await sql<{ id: string; label: string; area: string | null; min_covers: number; max_covers: number; online: boolean; active: boolean }[]>`
    select id, label, area, min_covers, max_covers, online, active from dining_tables
    where venue_id = ${venueId} and org_id = ${t.orgId}`;
  return rows
    .map((r) => ({ id: r.id, label: r.label, area: r.area, minCovers: r.min_covers, maxCovers: r.max_covers, online: r.online, active: r.active }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export async function saveTable(
  sql: Sql, t: Tenant, venueId: string,
  input: { id?: string; label: string; area: string; minCovers: number; maxCovers: number; online: boolean; active: boolean },
): Promise<string | null> {
  assertCan(t, "manage_venue", venueId);
  const label = input.label.trim().slice(0, 20);
  if (!label) return "Give the table a label.";
  if (!Number.isInteger(input.minCovers) || !Number.isInteger(input.maxCovers) || input.minCovers < 1 || input.maxCovers < input.minCovers || input.maxCovers > 40) {
    return "Seats must be whole numbers, with max at least min.";
  }
  const [v] = await sql`select 1 from venues where id = ${venueId} and org_id = ${t.orgId}`;
  if (!v) return "Venue not found.";
  try {
    if (input.id) {
      const rows = await sql`
        update dining_tables set label = ${label}, area = ${input.area.trim() || null}, min_covers = ${input.minCovers},
          max_covers = ${input.maxCovers}, online = ${input.online}, active = ${input.active}
        where id = ${input.id} and venue_id = ${venueId} and org_id = ${t.orgId} returning id`;
      if (!rows.length) return "Table not found.";
    } else {
      await sql`insert into dining_tables (org_id, venue_id, label, area, min_covers, max_covers, online, active)
                values (${t.orgId}, ${venueId}, ${label}, ${input.area.trim() || null}, ${input.minCovers}, ${input.maxCovers}, ${input.online}, ${input.active})`;
    }
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return `There's already a table called ${label}.`;
    throw err;
  }
  await log(sql, t.orgId, t.actor, input.id ? "floor.table_updated" : "floor.table_added", "dining_table", input.id ?? label, input);
  return null;
}

export interface PeriodRow {
  id: string; name: string; daysOfWeek: number[]; firstSeating: string; lastSeating: string;
  slotMinutes: number; maxCoversPerSlot: number | null; depositCentsPerCover: number;
}

export async function listPeriods(sql: Sql, t: Tenant, venueId: string): Promise<PeriodRow[]> {
  assertCan(t, "view", venueId);
  const rows = await sql<{ id: string; name: string; days_of_week: number[]; first_seating: string; last_seating: string; slot_minutes: number; max_covers_per_slot: number | null; deposit_cents_per_cover: number }[]>`
    select id, name, days_of_week, first_seating, last_seating, slot_minutes, max_covers_per_slot, deposit_cents_per_cover
    from service_periods where venue_id = ${venueId} and org_id = ${t.orgId} order by first_seating`;
  return rows.map((r) => ({
    id: r.id, name: r.name, daysOfWeek: r.days_of_week.map(Number), firstSeating: r.first_seating.slice(0, 5),
    lastSeating: r.last_seating.slice(0, 5), slotMinutes: r.slot_minutes, maxCoversPerSlot: r.max_covers_per_slot,
    depositCentsPerCover: r.deposit_cents_per_cover,
  }));
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function savePeriod(
  sql: Sql, t: Tenant, venueId: string,
  input: Omit<PeriodRow, "id"> & { id?: string },
): Promise<string | null> {
  assertCan(t, "manage_venue", venueId);
  const name = input.name.trim().slice(0, 40);
  const days = [...new Set(input.daysOfWeek)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  if (!name) return "Name the service, e.g. Dinner.";
  if (days.length === 0) return "Pick at least one day.";
  if (!TIME.test(input.firstSeating) || !TIME.test(input.lastSeating) || input.lastSeating < input.firstSeating) {
    return "Seating times must be HH:MM, last after first.";
  }
  if (![10, 15, 20, 30, 60].includes(input.slotMinutes)) return "Slots must be 10, 15, 20, 30 or 60 minutes.";
  if (input.maxCoversPerSlot !== null && (!Number.isInteger(input.maxCoversPerSlot) || input.maxCoversPerSlot < 1)) return "Pacing must be a whole number of covers.";
  if (!Number.isInteger(input.depositCentsPerCover) || input.depositCentsPerCover < 0 || input.depositCentsPerCover > 50000) return "Deposit per guest must be between $0 and $500.";
  const [v] = await sql`select 1 from venues where id = ${venueId} and org_id = ${t.orgId}`;
  if (!v) return "Venue not found.";
  if (input.id) {
    const rows = await sql`
      update service_periods set name = ${name}, days_of_week = ${days}, first_seating = ${input.firstSeating},
        last_seating = ${input.lastSeating}, slot_minutes = ${input.slotMinutes},
        max_covers_per_slot = ${input.maxCoversPerSlot}, deposit_cents_per_cover = ${input.depositCentsPerCover}
      where id = ${input.id} and venue_id = ${venueId} and org_id = ${t.orgId} returning id`;
    if (!rows.length) return "Service not found.";
  } else {
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating, slot_minutes, max_covers_per_slot, deposit_cents_per_cover)
              values (${t.orgId}, ${venueId}, ${name}, ${days}, ${input.firstSeating}, ${input.lastSeating}, ${input.slotMinutes}, ${input.maxCoversPerSlot}, ${input.depositCentsPerCover})`;
  }
  await log(sql, t.orgId, t.actor, "floor.service_saved", "service_period", input.id ?? name, { ...input, daysOfWeek: days });
  return null;
}

export async function deletePeriod(sql: Sql, t: Tenant, venueId: string, periodId: string): Promise<void> {
  assertCan(t, "manage_venue", venueId);
  await sql`delete from service_periods where id = ${periodId} and venue_id = ${venueId} and org_id = ${t.orgId}`;
  await log(sql, t.orgId, t.actor, "floor.service_deleted", "service_period", periodId);
}

export interface VenueRules {
  bookingHorizonDays: number; minNoticeMinutes: number; maxPartyOnline: number;
  cancellationPolicy: string; cancelCutoffHours: number; phone: string; address: string; timezone: string;
}

export async function getVenueRules(sql: Sql, t: Tenant, venueId: string): Promise<VenueRules | null> {
  assertCan(t, "view", venueId);
  const [v] = await sql<{ booking_horizon_days: number; min_notice_minutes: number; max_party_online: number; cancellation_policy: string; cancel_cutoff_hours: number; phone: string | null; address: string | null; timezone: string }[]>`
    select booking_horizon_days, min_notice_minutes, max_party_online, cancellation_policy, cancel_cutoff_hours, phone, address, timezone
    from venues where id = ${venueId} and org_id = ${t.orgId}`;
  return v ? {
    bookingHorizonDays: v.booking_horizon_days, minNoticeMinutes: v.min_notice_minutes, maxPartyOnline: v.max_party_online,
    cancellationPolicy: v.cancellation_policy, cancelCutoffHours: v.cancel_cutoff_hours, phone: v.phone ?? "", address: v.address ?? "", timezone: v.timezone,
  } : null;
}

export async function saveVenueRules(sql: Sql, t: Tenant, venueId: string, r: VenueRules): Promise<string | null> {
  assertCan(t, "manage_venue", venueId);
  const ints: [number, number, number, string][] = [
    [r.bookingHorizonDays, 1, 365, "Booking window"], [r.minNoticeMinutes, 0, 2880, "Minimum notice"],
    [r.maxPartyOnline, 1, 30, "Largest online party"], [r.cancelCutoffHours, 0, 168, "Cancellation cut-off"],
  ];
  for (const [v, lo, hi, name] of ints) if (!Number.isInteger(v) || v < lo || v > hi) return `${name} must be between ${lo} and ${hi}.`;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: r.timezone });
  } catch {
    return "Unknown timezone.";
  }
  await sql`update venues set booking_horizon_days = ${r.bookingHorizonDays}, min_notice_minutes = ${r.minNoticeMinutes},
              max_party_online = ${r.maxPartyOnline}, cancellation_policy = ${r.cancellationPolicy.trim().slice(0, 600)},
              cancel_cutoff_hours = ${r.cancelCutoffHours}, phone = ${r.phone.trim() || null}, address = ${r.address.trim() || null},
              timezone = ${r.timezone}
            where id = ${venueId} and org_id = ${t.orgId}`;
  await log(sql, t.orgId, t.actor, "venue.rules_saved", "venue", venueId, { ...r });
  return null;
}

/* ----------------------------------------------------- integrations -- */

export interface OrgIntegration { provider: ProviderId; status: string; accountLabel: string | null; updatedAt: Date; updatedBy: string }

export async function listOrgIntegrations(sql: Sql, t: Tenant): Promise<OrgIntegration[]> {
  assertCan(t, "view");
  const rows = await sql<{ provider: ProviderId; status: string; account_label: string | null; updated_at: Date; updated_by: string }[]>`
    select provider, status, account_label, updated_at, updated_by from org_integrations where org_id = ${t.orgId}`;
  return rows.map((r) => ({ provider: r.provider, status: r.status, accountLabel: r.account_label, updatedAt: r.updated_at, updatedBy: r.updated_by }));
}

/**
 * Shell connect: the restaurant asks, the studio sets it up by hand and
 * marks it connected. When a provider's OAuth flow is built, "request"
 * becomes a redirect and "connected" is set by its callback.
 */
export async function setIntegration(
  sql: Sql, t: Tenant, providerId: string, status: "requested" | "connected" | "disconnected", accountLabel?: string,
): Promise<string | null> {
  const p = provider(providerId);
  if (!p || p.scope !== "restaurant") return "Unknown connection.";
  assertCan(t, status === "connected" ? "manage_team" : "manage_venue");
  if (status === "connected" && t.role !== "staff") return "The Pass team completes this connection.";
  await sql`
    insert into org_integrations (org_id, provider, status, account_label, updated_by)
    values (${t.orgId}, ${p.id}, ${status}, ${accountLabel?.trim() || null}, ${t.actor})
    on conflict (org_id, provider) do update
      set status = excluded.status, account_label = coalesce(excluded.account_label, org_integrations.account_label),
          updated_by = excluded.updated_by, updated_at = now(), error = null`;
  await log(sql, t.orgId, t.actor, `integration.${status}`, "integration", p.id);
  return null;
}
