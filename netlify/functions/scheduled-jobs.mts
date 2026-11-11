/**
 * The platform's clock. Netlify runs this on a schedule; it calls the
 * app's own job endpoints with the shared secret, so the work itself
 * lives in the app (and its tests) rather than in here.
 *
 *  - every hour:  reminders for bookings 20–28 hours out
 *  - 15:00 UTC:   each restaurant's agents that have work — Reservations,
 *                 and Reviews where replies are waiting (10–11 am US Eastern,
 *                 inside the texting window, so an owner can approve the
 *                 same morning)
 *
 * Needs AGENT_CRON_SECRET and URL (Netlify sets URL). Without the
 * secret it does nothing.
 */
export default async function handler() {
  const base = process.env.URL;
  const secret = process.env.AGENT_CRON_SECRET;
  if (!base || !secret) return new Response("not configured", { status: 200 });
  const auth = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

  const results: Record<string, unknown> = {};
  results.reminders = await fetch(`${base}/api/jobs/reminders`, { method: "POST", headers: auth })
    .then((r) => r.json()).catch((e) => ({ error: String(e) }));

  // 08:00 UTC (3–4 am Eastern): re-read the last 30 days of ad numbers,
  // before anyone opens the report.
  if (new Date().getUTCHours() === 8) {
    results.ads = await fetch(`${base}/api/jobs/ads-sync`, { method: "POST", headers: auth })
      .then((r) => r.json()).catch((e) => ({ error: String(e) }));
  }

  if (new Date().getUTCHours() === 15) {
    // Only the agents that have something to look at, per restaurant.
    const plan = await fetch(`${base}/api/jobs/orgs`, { headers: auth }).then((r) => r.json()).catch(() => ({ runs: [] }));
    for (const { org, agent } of (plan.runs ?? []) as { org: string; agent: string }[]) {
      results[`${agent}:${org}`] = await fetch(`${base}/api/agents/run`, {
        method: "POST", headers: auth, body: JSON.stringify({ org, agent }),
      }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
    }
  }
  console.log(JSON.stringify(results));
  return new Response("ok");
}

// Read by Netlify at deploy time.
export const config = { schedule: "@hourly" };
