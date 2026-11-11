import type { Sql } from "postgres";
import { applyStripeEvent, verifyStripeSignature } from "../payments/stripe";
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
  google_ads: shell("google_ads",
    "OAuth (adwords). sync: daily campaign metrics into the reporting tables (see lib/connectors). Writes: budget and negative-keyword mutations from approved proposals."),
  meta_ads: shell("meta_ads",
    "OAuth (ads_read, ads_management). sync: daily insights. Writes: budget changes from approved proposals."),
  square: shell("square",
    "OAuth (ORDERS_READ, CUSTOMERS_READ). Webhook payment.updated → match the card holder or phone to a guest, record a visit and spend."),
  toast: shell("toast",
    "Partner API. Webhook on closed checks → match to a guest by phone, record a visit and spend."),
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
