import type { Sql } from "postgres";
import { createGiftCardCheckout } from "../payments/stripe";

/** Kept apart from actions.ts so it isn't exposed as a server action. */
export function createGiftCheckoutUrl(
  sql: Sql, key: string,
  input: { orgId: string; giftCardId: string; amountCents: number; description: string; returnUrl: string; email: string },
): Promise<string> {
  return createGiftCardCheckout(sql, key, input);
}
