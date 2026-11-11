/**
 * Give an email owner access to a restaurant, so it can sign in at /login.
 *
 *   npm run add-owner -- you@example.com            (demo restaurant)
 *   npm run add-owner -- you@example.com santorini
 *
 * Works the same in PowerShell, cmd and bash.
 */
import postgres from "postgres";

const [email, org = "santorini"] = process.argv.slice(2);
const url = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Usage: npm run add-owner -- you@example.com [restaurant-slug]");
  process.exit(1);
}

const sql = postgres(url, {
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
  prepare: false, max: 1, onnotice: () => {},
});

try {
  const rows = await sql`
    insert into org_members (org_id, email, role)
    select id, ${email.trim().toLowerCase()}, 'owner' from orgs where slug = ${org}
    on conflict (org_id, email) do update set role = 'owner'
    returning id`;
  if (rows.length === 0) {
    console.error(`No restaurant called "${org}". Run npm run seed:demo first.`);
    process.exitCode = 1;
  } else {
    console.log(`${email} is now an owner of ${org}. Sign in at http://localhost:3000/login`);
  }
} catch (err) {
  console.error("Failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
