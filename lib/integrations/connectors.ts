import type { Sql } from "postgres";
import { applyStripeEvent, verifyStripeSignature } from "../payments/stripe";
import { handleSquareEvent, verifySquareSignature } from "./square";
import { syncToast } from "./toast";
import type { ProviderId } from "./registry";

/**
 * The slot every outside service plugs into. A connector is built when
 * its four methods are real; until then it's a shell that says what it
 * will do, so the rest of the platform (settings, agents, webhooks) can
 * already be written against it.
 *
 *   authorizeUrl  — where to send an owner to grant access (OAuth)
 *   complete      — exchange the callback for tokens, store the account
 *   sync          — pull what we need on a schedule (hours, reviews, checks)
 *   handleWebhook — verify and apply a push from the provider
 *
 * Tokens are stored server-side only (encrypted at rest when real),
 * never sent to a browser, never typed into a form.
 */
export interface Connector {
  id: ProviderId;
  built: boolean;
  authorizeUrl(orgId: string, returnTo: string): string | null;
  complete(sql: Sql, orgId: string, params: URLSearchParams): Promise<{ accountLabel: string }>;
  sync(sql: Sql, orgId: string): Promise<{ changed: number }>;
  handleWebhook(sql: Sql, rawBody: string, headers: Headers): Promise<{ handled: boolean }>;
}

class NotBuilt extends Error {
  constructor(id: string) {
    super(`${id} isn't connected yet.`);
    this.name = "NotBuilt";
  }
}

function shell(id: ProviderId, plan: string): Connector {
  return {
    id,
    built: false,
    authorizeUrl: () => null,
    complete: async () => { throw new NotBuilt(id); },
    sync: async () => ({ changed: 0 }),
    handleWebhook: async () => { throw new NotBuilt(`${id} webhooks`); },
    // Kept on the object for whoever builds it next.
    ...({ plan } as object),
  };
}

export const CONNECTORS: Partial<Record<ProviderId, Connector>> = {
  // Built in lib/integrations/google.ts: OAuth via /api/integrations/google,
  // hours pushed from service periods, reviews pulled, replies posted.
  // Still to do: special (holiday) hours, Pub/Sub review notifications.
  google_business: {
    ...shell("google_business", "See lib/integrations/google.ts."),
    built: false,
  },
  reserve_with_google: shell("reserve_with_google",
    "Partner program (Actions Center). Feeds: merchants, services, availability from findSlots. Booking server endpoints: CheckAvailability, CreateBooking → book(channel 'online', source 'google')."),
  // Built in lib/ads/google-ads.ts (OAuth, nightly 30-day sync). Writes
  // (budgets, negatives) come with the Paid Ads agent on live data.
  google_ads: shell("google_ads", "See lib/ads/google-ads.ts."),
  // Built in lib/ads/meta.ts (OAuth, nightly 30-day sync).
  meta_ads: shell("meta_ads", "See lib/ads/meta.ts."),
  square: {
    id: "square",
    built: true,
    authorizeUrl: () => null, // via /api/integrations/square/start
    complete: async () => { throw new NotBuilt("square (via /api/integrations/square/callback)"); },
    sync: async () => ({ changed: 0 }),
    async handleWebhook(sql, raw, headers) {
      const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
      const site = (process.env.SITE_URL ?? process.env.URL ?? "").replace(/\/+$/, "");
      if (!key || !site || !verifySquareSignature(raw, headers.get("x-square-hmacsha256-signature"), `${site}/api/webhooks/square`, key)) {
        throw new BadSignature();
      }
      return { handled: await handleSquareEvent(sql, JSON.parse(raw)) };
    },
  },
  // Built in lib/integrations/toast.ts on Standard API access: the owner
  // pastes read-only credentials in Settings; hourly sync via
  // /api/jobs/pos-sync. No webhooks: those need the Integration Partner
  // program, as do order injection and writing menus back.
  toast: {
    id: "toast",
    built: true,
    authorizeUrl: () => null,
    complete: async () => { throw new NotBuilt("toast (via the Connect form in Settings)"); },
    async sync(sql, orgId) {
      const r = await syncToast(sql, orgId);
      if (!r.ok) throw new Error(r.error ?? "Toast sync failed.");
      return { changed: r.rows };
    },
    handleWebhook: async () => { throw new NotBuilt("toast webhooks (Integration Partner program only)"); },
  },
  stripe: {
    id: "stripe",
    built: true,
    authorizeUrl: () => null,
    complete: async () => { throw new NotBuilt("stripe (platform account, configured by environment)"); },
    sync: async () => ({ changed: 0 }),
    async handleWebhook(sql, raw, headers) {
      const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
      if (!secret || !verifyStripeSignature(raw, headers.get("stripe-signature"), secret)) {
        throw new BadSignature();
      }
      return { handled: await applyStripeEvent(sql, JSON.parse(raw)) };
    },
  },
};

export class BadSignature extends Error {
  constructor() {
    super("Signature didn't verify.");
    this.name = "BadSignature";
  }
}

export function connector(id: string): Connector | undefined {
  return CONNECTORS[id as ProviderId];
}
