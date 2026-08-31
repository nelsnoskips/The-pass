/**
 * Applies db/schema.sql. Every statement in it is idempotent, so this
 * is safe to run against a live database and safe to run twice.
 *
 * This runs as the first half of the Netlify build, so a schema change
 * reaches production with the code that needs it. Shipping a column's
 * reader without the column is the failure this prevents, and it is not
 * one you find out about until a client clicks something.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

// The same resolution order as lib/db.ts, and for the same reason:
// Netlify's Neon extension sets NETLIFY_DATABASE_URL and will not let
// you create a DATABASE_URL by hand. Reading only the latter here would
// mean the build quietly migrated nothing.
const url =
  process.env.DATABASE_URL ??
  process.env.NETLIFY_DATABASE_URL ??
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

// No database configured is a legitimate state — the whole app degrades
// to a setup screen without one — so skip rather than fail the build.
// A misconfigured database still fails loudly below.
if (!url) {
  console.log("No database configured. Skipping migration.");
  process.exit(0);
}

const sql = postgres(url, {
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
  prepare: false,
  max: 1,
  // "already exists, skipping" is what a guarded schema is supposed to
  // say, and on every deploy it is most of the file. Dropping just those
  // keeps the build log readable without hiding a notice worth reading.
  onnotice: (notice) => {
    if (!/already exists, skipping/.test(notice.message ?? "")) {
      console.log(`  ${notice.message}`);
    }
  },
});

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

try {
  await sql.unsafe(schema);
  const [{ count }] = await sql`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public'
  `;
  console.log(`Schema applied. ${count} tables in public.`);
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
