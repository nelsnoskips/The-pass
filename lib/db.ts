import postgres from "postgres";

/**
 * One Postgres client for the whole app.
 *
 * postgres.js rather than a Neon-specific driver: the same code then
 * talks to a local Postgres in development and to Neon in production,
 * so what gets verified here is what runs there. Neon's pooled
 * connection string is a normal Postgres endpoint — it just needs
 * prepared statements off, because pgbouncer in transaction mode
 * cannot carry them between checkouts.
 *
 * The client is cached on globalThis so Next's dev server does not open
 * a new pool on every hot reload and exhaust the connection limit.
 */
declare global {
  // eslint-disable-next-line no-var
  var __passSql: ReturnType<typeof postgres> | undefined;
}

/**
 * Netlify's own Neon extension provisions a database and sets
 * NETLIFY_DATABASE_URL itself, and then refuses to let you create a
 * DATABASE_URL by hand because it owns that name. Reading either means
 * the app works whether the database was attached through Netlify or
 * set up directly in Neon, and nobody has to discover which.
 *
 * Preference order puts the hand-set variable first: if someone has
 * deliberately pointed this at a specific database, that beats whatever
 * an integration provisioned.
 */
export function databaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.NETLIFY_DATABASE_URL ??
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ??
    undefined
  );
}

function create() {
  const url = databaseUrl();
  if (!url) return undefined;
  return postgres(url, {
    // Neon and most managed Postgres require TLS; a local socket does not.
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    prepare: false,
    max: 5,
    idle_timeout: 20,
  });
}

export const sql = globalThis.__passSql ?? create();
if (process.env.NODE_ENV !== "production") globalThis.__passSql = sql;

/**
 * Every page that reads the studio database goes through here rather
 * than touching `sql` directly. Before the environment variable is set
 * there is no database at all, and the honest answer is a setup screen
 * rather than a stack trace — so callers get undefined and render one.
 */
export function db() {
  return sql;
}

export const isConfigured = () => Boolean(databaseUrl());
