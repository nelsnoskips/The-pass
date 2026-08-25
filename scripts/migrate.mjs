/**
 * Applies db/schema.sql. Every statement in it is idempotent, so this
 * is safe to run against a live database and safe to run twice.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Nothing to migrate.");
  process.exit(1);
}

const sql = postgres(url, {
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
  prepare: false,
  max: 1,
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
