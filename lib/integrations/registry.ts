/**
 * Every outside service the platform talks to, in one list.
 *
 * Two kinds:
 *  - platform: one account for all restaurants, configured by
 *    environment variables (Twilio sends every restaurant's texts).
 *  - restaurant: each restaurant connects its own account (its Google
 *    Business Profile, its Square). Stored in org_integrations.
 *
 * A provider that isn't wired up yet is a shell: listed, with what it
 * will do and what it needs, so the shape of the platform is visible and
 * connecting one is filling in a known slot rather than a redesign.
 */

export type ProviderId =
  | "anthropic" | "twilio" | "resend" | "stripe"
  | "google_business" | "google_ads" | "meta_ads"
  | "square" | "toast" | "reserve_with_google";

export type Category = "AI" | "Messaging" | "Payments" | "Marketing" | "Point of sale" | "Discovery";

export interface Provider {
  id: ProviderId;
  name: string;
  category: Category;
  scope: "platform" | "restaurant";
  /** What it does for the restaurant, in one line. */
  does: string;
  /** Environment variables a platform provider needs. */
  env: string[];
  /** live: working code path. shell: listed, connection not built yet. */
  build: "live" | "shell";
}

export const PROVIDERS: Provider[] = [
  { id: "anthropic", name: "Claude (Anthropic)", category: "AI", scope: "platform", build: "live",
    does: "Runs the agents: website edits, quiet-night campaigns.", env: ["ANTHROPIC_API_KEY"] },
  { id: "twilio", name: "Twilio", category: "Messaging", scope: "platform", build: "live",
    does: "Sends confirmations, reminders, waitlist and campaign texts.", env: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"] },
  { id: "resend", name: "Resend", category: "Messaging", scope: "platform", build: "live",
    does: "Sends sign-in links and email.", env: ["RESEND_API_KEY"] },
  { id: "stripe", name: "Stripe", category: "Payments", scope: "platform", build: "live",
    does: "Takes deposits at booking; card details never touch The Pass.", env: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
  { id: "google_business", name: "Google Business Profile", category: "Discovery", scope: "restaurant", build: "live",
    does: "Keeps hours and details in sync on Google; reads and answers reviews.", env: [] },
  { id: "reserve_with_google", name: "Reserve with Google", category: "Discovery", scope: "restaurant", build: "shell",
    does: "A Reserve button on Google Search and Maps that books straight into The Pass.", env: [] },
  { id: "google_ads", name: "Google Ads", category: "Marketing", scope: "restaurant", build: "shell",
    does: "Reads campaigns for reporting; applies approved budget and keyword changes.", env: [] },
  { id: "meta_ads", name: "Meta Ads", category: "Marketing", scope: "restaurant", build: "shell",
    does: "Reads Instagram and Facebook campaigns; applies approved changes.", env: [] },
  { id: "square", name: "Square", category: "Point of sale", scope: "restaurant", build: "live",
    does: "Matches checks to guests so visits and spend fill the guest list.", env: [] },
  { id: "toast", name: "Toast", category: "Point of sale", scope: "restaurant", build: "shell",
    does: "Matches checks to guests so visits and spend fill the guest list.", env: [] },
];

export function provider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Whether a platform provider's environment is set. Never reveals values. */
export function platformConfigured(p: Provider): boolean {
  return p.env.length > 0 && p.env.every((k) => Boolean(process.env[k]?.trim()));
}
