/**
 * Fills the demo restaurant with a believable week, for test deploys and
 * demos: invented guests, a book of reservations for each of the next 7
 * days (laid out on real tables with no two parties on one table), online
 * ordering and loyalty switched on, the guest app published, and one
 * proposal from the Reservations station waiting for approval.
 *
 *   DATABASE_URL=... node scripts/demo-day.mjs
 *
 * Safe to run on every deploy: settings are only created when missing (a
 * change made by hand is kept), guests are added once, and a day that
 * already has bookings is left alone. All names and numbers are invented;
 * phone numbers use the 555-01xx range reserved for fiction.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL.");
  process.exit(1);
}
const sql = postgres(url, {
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
  prepare: false, max: 1, onnotice: () => {},
});
const site = (process.env.DEPLOY_PRIME_URL || process.env.URL || process.env.SITE_URL || "").replace(/\/+$/, "");

/* ---- venue-local time, DST-correct, no libraries ---------------------- */
function offsetMinutes(instant, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUtc - instant.getTime()) / 60_000;
}
function zoned(date, time, tz) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - offsetMinutes(new Date(guess), tz) * 60_000;
  t = guess - offsetMinutes(new Date(t), tz) * 60_000;
  return new Date(t);
}
const localDate = (instant, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(instant);
const addDays = (date, n) => { const [y, m, d] = date.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const weekday = (date) => { const [y, m, d] = date.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const token = () => [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, "0")).join("");

/* ---- the cast -------------------------------------------------------- */
const GUESTS = [
  ["Helena Markou", 14, 9, "Regular · prefers the terrace", ["VIP"]],
  ["Nikos Pappas", 9, 12, "Anniversary in December", ["Regular"]],
  ["Sofia Lambros", 7, 51, null, ["Regular"]],
  ["Daniel Reyes", 6, 63, "Shellfish allergy", ["Regular"]],
  ["Maya Goldberg", 5, 48, null, []],
  ["James Whitfield", 11, 70, "Likes the corner table, T14", ["VIP"]],
  ["Priya Natarajan", 4, 55, "Vegetarian", []],
  ["Marcus Bell", 8, 66, null, ["Regular"]],
  ["Elena Russo", 3, 20, null, []],
  ["Theo Andreou", 12, 5, "Owner's friend — say hello", ["VIP"]],
  ["Grace Kim", 2, 30, "Nut allergy", []],
  ["Omar Haddad", 6, 47, null, ["Regular"]],
  ["Lucy Fontaine", 1, 14, null, []],
  ["Carlos Mendes", 5, 90, null, []],
  ["Hannah Weiss", 3, 8, "Birthday this week", []],
  ["Andre Thompson", 7, 58, null, ["Regular"]],
  ["Zoe Papadakis", 2, 33, null, []],
  ["Ben Carter", 4, 61, "Gluten-free", []],
  ["Ana Perez", 9, 52, null, ["Regular"]],
  ["Leo Martins", 1, 6, null, []],
  ["Isabel Cruz", 3, 26, null, []],
  ["Sam Ellis", 0, null, "First visit — booked for a birthday", []],
  ["Chloe Dubois", 6, 75, null, ["Regular"]],
  ["Ravi Shah", 2, 40, null, []],
  ["Nora Quinn", 5, 19, "Wine club member", []],
  ["Felix Wagner", 1, 3, null, []],
  ["Irene Kostas", 8, 49, null, ["Regular"]],
  ["Tom Becker", 0, null, null, []],
];
const phoneOf = (i) => `+1954555${String(100 + i).padStart(4, "0")}`; // 555-0100… fictional range

try {
  const [org] = await sql`select o.id, v.id as venue_id, v.timezone from orgs o join venues v on v.org_id = o.id
                          where o.slug = 'santorini' order by v.created_at limit 1`;
  if (!org) {
    console.log("[demo-day] No demo restaurant yet; run seed:demo first.");
    process.exit(0);
  }
  const tz = org.timezone;
  const now = new Date();

  // Settings: created only when missing, so a hand-made change is kept.
  await sql`insert into ordering_settings (org_id, pickup_enabled, catering_enabled, tax_bps, catering_min_cents, updated_by)
            values (${org.id}, true, true, 700, 20000, 'demo') on conflict (org_id) do nothing`;
  await sql`insert into loyalty_programs (org_id, active, visits_required, reward)
            values (${org.id}, true, 5, 'A dessert on us') on conflict (org_id) do nothing`;
  const app = {
    name: "Santorini by Georgios", shortName: "Santorini", accent: "#1f4f8f", background: "#f6f1e7",
    icon: { mode: "initials", glyph: "" }, welcome: "Greek cooking over open fire, on Las Olas.",
    tiles: ["order", "reserve", "menu", "loyalty", "gift_cards", "hours", "call", "instagram"].map((id) => ({ id, on: id !== "instagram" })),
    announcement: "",
  };
  await sql`insert into app_configs (org_id, draft, published, published_at, updated_by)
            values (${org.id}, ${sql.json(app)}, ${sql.json(app)}, now(), 'demo') on conflict (org_id) do nothing`;

  // Guests: added once, with consent for most, so audiences have people in them.
  const guestIds = [];
  for (let i = 0; i < GUESTS.length; i++) {
    const [name, visits, daysAgo, notes, tags] = GUESTS[i];
    const consented = i % 6 !== 5;
    const [g] = await sql`
      insert into guests (org_id, phone, name, email, notes, tags, visit_count, last_visit_at, total_spend_cents,
                          sms_consent_at, sms_consent_source, email_consent_at, email_consent_source)
      values (${org.id}, ${phoneOf(i)}, ${name}, ${`${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`}, ${notes}, ${tags},
              ${visits}, ${daysAgo === null ? null : new Date(now.getTime() - daysAgo * 86_400_000)}, ${visits * 8_600},
              ${consented ? new Date(now.getTime() - 200 * 86_400_000) : null}, ${consented ? "booking:website" : null},
              ${consented ? new Date(now.getTime() - 200 * 86_400_000) : null}, ${consented ? "booking:website" : null})
      on conflict (org_id, phone) do update set phone = excluded.phone
      returning id, (xmax = 0) as fresh`;
    // Regulars have been around a while; two guests are new this week.
    if (g.fresh) {
      const since = i === 12 || i === 19 ? 3 + (i % 4) : 60 + i * 11;
      await sql`update guests set created_at = ${new Date(now.getTime() - since * 86_400_000)} where id = ${g.id}`;
    }
    guestIds.push(g.id);
  }

  // Tables and turn times, to lay bookings out without collisions.
  const tables = await sql`select id, label, min_covers, max_covers from dining_tables
                           where venue_id = ${org.venue_id} and active and online order by max_covers, label`;
  const turn = (party) => (party <= 2 ? 75 : party <= 4 ? 90 : party <= 6 ? 105 : 120);
  const PARTIES = [2, 2, 4, 2, 6, 2, 4, 3, 2, 4, 2, 8, 2, 4, 5, 2];
  const SOURCES = ["website", "website", "website", "phone", "google", "website", "instagram", "phone"];
  // Occasions only: allergies and preferences live on the guest, and the
  // host stand and morning pass already show those.
  const NOTES = { 1: "Anniversary", 14: "Birthday — candle on dessert", 21: "Birthday", 24: "Wine pairing" };

  let added = 0;
  const today = localDate(now, tz);

  // Four weeks of past service, once, so last night, "usual for a
  // Saturday" and the reports have something real to show.
  const [{ past }] = await sql`select count(*)::int as past from reservations where venue_id = ${org.venue_id} and starts_at < ${zoned(today, "00:00", tz)}`;
  if (past === 0) {
    await sql`update orgs set created_at = least(created_at, ${new Date(now.getTime() - 60 * 86_400_000)}) where id = ${org.id}`;
    for (let d = -28; d < 0; d++) {
      const date = addDays(today, d);
      const dow = weekday(date);
      if (dow === 1) continue;
      const count = dow === 5 || dow === 6 ? 15 : dow === 2 ? 6 : 10;
      for (let k = 0; k < count; k++) {
        const party = PARTIES[(k + d + 40) % PARTIES.length];
        const from = 17 * 60 + ((k * 4) % 18) * 15;
        const startsAt = zoned(date, hhmm(from), tz), endsAt = zoned(date, hhmm(from + turn(party)), tz);
        const status = (k + d) % 17 === 0 ? "no_show" : "completed";
        const source = k % 7 === 6 ? "walk_in" : SOURCES[(k + d + 40) % SOURCES.length];
        const [r] = await sql`
          insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, source, manage_token, created_at)
          values (${org.id}, ${org.venue_id}, ${guestIds[(k * 7 + d + 280) % GUESTS.length]}, ${party}, ${startsAt}, ${endsAt},
                  ${status}, ${source}, ${token()}, ${new Date(startsAt.getTime() - 3 * 86_400_000)})
          returning id`;
        const t = tables.find((x) => party >= x.min_covers && party <= x.max_covers) ?? tables[tables.length - 1];
        await sql`insert into reservation_tables (reservation_id, table_id, org_id, during, live)
                  values (${r.id}, ${t.id}, ${org.id}, tstzrange(${startsAt}, ${endsAt}), false)`;
      }
    }
  }
  for (let d = 0; d < 7; d++) {
    const date = addDays(today, d);
    const dow = weekday(date);
    if (dow === 1) continue; // closed Mondays (no dinner service)
    const start = zoned(date, "00:00", tz);
    const end = new Date(start.getTime() + 86_400_000);
    const [{ n }] = await sql`select count(*)::int as n from reservations where venue_id = ${org.venue_id} and starts_at >= ${start} and starts_at < ${end}`;
    if (n > 0) continue;

    const busy = new Map(); // table id → [[from,to]] minutes
    const free = (t, from, to) => (busy.get(t.id) ?? []).every(([a, b]) => to <= a || from >= b);
    const slots = [];
    const dinner = dow === 5 || dow === 6 ? 16 : dow === 2 ? 6 : 11; // Fri/Sat full, Tuesday quiet
    for (let k = 0; k < dinner; k++) slots.push(17 * 60 + ((k * 4) % 18) * 15);
    if (dow === 0 || dow === 6) for (let k = 0; k < 6; k++) slots.push(11 * 60 + ((k * 3) % 11) * 15);

    for (let k = 0; k < slots.length; k++) {
      const party = PARTIES[(k + d) % PARTIES.length];
      const from = slots[k], to = from + turn(party);
      const table = tables.find((t) => party >= t.min_covers && party <= t.max_covers && free(t, from, to));
      if (!table) continue;
      busy.set(table.id, [...(busy.get(table.id) ?? []), [from, to]]);
      const gi = (k * 5 + d * 3) % GUESTS.length;
      const startsAt = zoned(date, hhmm(from), tz), endsAt = zoned(date, hhmm(to), tz);
      const status = endsAt < now ? "completed" : startsAt < now ? "seated" : "booked";
      const [r] = await sql`
        insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, source, notes, manage_token)
        values (${org.id}, ${org.venue_id}, ${guestIds[gi]}, ${party}, ${startsAt}, ${endsAt}, ${status},
                ${SOURCES[(k + d) % SOURCES.length]}, ${NOTES[gi] ?? null}, ${token()})
        returning id`;
      await sql`insert into reservation_tables (reservation_id, table_id, org_id, during, live)
                values (${r.id}, ${table.id}, ${org.id}, tstzrange(${startsAt}, ${endsAt}), ${status !== "completed"})`;
      added++;
    }
  }

  // One proposal waiting: fill the quiet Tuesday from lapsed regulars.
  const [{ waiting }] = await sql`select count(*)::int as waiting from agent_proposals
                                  where org_id = ${org.id} and status = 'pending' and tool = 'send_guest_sms'`;
  if (waiting === 0) {
    const lapsed = await sql`select id from guests where org_id = ${org.id} and visit_count >= 3 and sms_consent_at is not null
                             and sms_opted_out_at is null and last_visit_at < now() - interval '45 days' order by visit_count desc limit 8`;
    if (lapsed.length) {
      const reserve = site ? `${site}/s/santorini/reserve` : "our website";
      await sql`
        insert into agent_proposals (org_id, agent_id, tool, input, title, rationale)
        values (${org.id}, 'reservations', 'send_guest_sms',
          ${sql.json({
            guest_ids: lapsed.map((g) => g.id),
            message: `Santorini: the lamb kleftiko is back this Tuesday and the terrace is open. We'd love to see you. Book at ${reserve}`,
            rationale: `Tuesday is quiet: 6 bookings against 11–16 on other nights. These ${lapsed.length} regulars have 3+ visits each and haven't been in for over six weeks.`,
          })},
          ${`Text ${lapsed.length} regulars about Tuesday`},
          ${`Tuesday is quiet: 6 bookings against 11–16 on other nights. These ${lapsed.length} regulars have 3+ visits each and haven't been in for over six weeks.`})`;
    }
  }
  console.log(`[demo-day] Demo week ready: ${added} bookings added, ${GUESTS.length} guests, ordering and loyalty on, app published.`);
} catch (err) {
  console.error("[demo-day] Failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
