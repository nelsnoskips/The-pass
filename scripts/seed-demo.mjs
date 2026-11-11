/**
 * Seeds the demo restaurant on the platform: an org, a venue with a
 * floor of tables and service hours, and a published website.
 *
 *   DATABASE_URL=... npm run seed:demo
 *
 * Safe to run twice: if the org already exists it does nothing. This is
 * a demo fixture (the same invented restaurant the reporting demo uses),
 * not client data.
 */
import { readFileSync } from "node:fs";
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
const content = JSON.parse(readFileSync(new URL("../lib/sites/demo-content.json", import.meta.url), "utf8"));

try {
  const [existing] = await sql`select id from orgs where slug = 'santorini'`;
  if (existing) {
    console.log("Demo org already exists. Nothing to do.");
  } else {
    await sql.begin(async (tx) => {
      const [org] = await tx`insert into orgs (name, slug) values ('Santorini by Georgios', 'santorini') returning id`;
      const [venue] = await tx`
        insert into venues (org_id, name, slug, timezone, phone, address, min_notice_minutes)
        values (${org.id}, 'Fort Lauderdale', 'fort-lauderdale', 'America/New_York',
                ${content.contact.phone}, ${content.contact.address}, 45)
        returning id`;
      const tables = [
        ...["T1", "T2", "T3", "T4", "T5", "T6"].map((label) => ({ label, area: "Dining room", min: 1, max: 2, online: true })),
        ...["T10", "T11", "T12", "T13", "T14"].map((label) => ({ label, area: "Dining room", min: 2, max: 4, online: true })),
        ...["T20", "T21"].map((label) => ({ label, area: "Terrace", min: 4, max: 6, online: true })),
        { label: "T30", area: "Terrace", min: 6, max: 8, online: true },
        ...["B1", "B2"].map((label) => ({ label, area: "Bar", min: 1, max: 2, online: false })),
      ];
      for (const t of tables) {
        await tx`insert into dining_tables (org_id, venue_id, label, area, min_covers, max_covers, online)
                 values (${org.id}, ${venue.id}, ${t.label}, ${t.area}, ${t.min}, ${t.max}, ${t.online})`;
      }
      await tx`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating, slot_minutes)
               values (${org.id}, ${venue.id}, 'Dinner', '{0,2,3,4,5,6}', '17:00', '21:30', 15),
                      (${org.id}, ${venue.id}, 'Brunch', '{0,6}', '11:00', '14:00', 15)`;
      const [site] = await tx`insert into sites (org_id, venue_id, slug) values (${org.id}, ${venue.id}, 'santorini') returning id`;
      const [version] = await tx`
        insert into site_versions (org_id, site_id, content, note, created_by)
        values (${org.id}, ${site.id}, ${tx.json(content)}, 'Initial site', 'seed') returning id`;
      await tx`update sites set published_version_id = ${version.id} where id = ${site.id}`;
    });
    console.log("Seeded. Site: /s/santorini");
  }
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
