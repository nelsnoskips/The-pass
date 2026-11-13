/**
 * Test deploys only: load the demo restaurant and give the tester an
 * owner login, so a preview can be tried without running anything on a
 * computer. Runs during the Netlify build when DEMO_SETUP=1 is set for
 * the deploy-preview / branch-deploy context. It refuses to run on a
 * production deploy, and both steps are safe to repeat on every deploy.
 *
 *   DEMO_SETUP=1
 *   DEMO_OWNER_EMAIL=you@example.com   (optional: who can sign in)
 */
import { execFileSync } from "node:child_process";

const on = process.env.DEMO_SETUP === "1";
const context = process.env.CONTEXT ?? "";
if (!on) process.exit(0);
if (context === "production") {
  console.log("[preview-setup] Skipped: never seeds a production deploy.");
  process.exit(0);
}
if (!(process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL)) {
  console.log("[preview-setup] Skipped: no database configured.");
  process.exit(0);
}

const run = (args) => execFileSync(process.execPath, args, { stdio: "inherit", env: process.env });
run(["scripts/seed-demo.mjs"]);
const email = process.env.DEMO_OWNER_EMAIL?.trim();
if (email) run(["scripts/add-owner.mjs", email, "santorini"]);
console.log("[preview-setup] Demo restaurant ready at /r/santorini.");
