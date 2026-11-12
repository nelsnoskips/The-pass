"use server";

import { db } from "../db";
import { lookupCard } from "../giftcards";
import { requireTenant } from "./context";

/** A card's balance, for the "it will have $X left" check before redeeming. */
export async function checkCardAction(org: string, code: string): Promise<{ code: string; balanceCents: number; status: string } | null> {
  const { tenant } = await requireTenant(org);
  const c = await lookupCard(db()!, tenant, String(code ?? "").slice(0, 40));
  return c ? { code: c.code, balanceCents: c.balance_cents, status: c.status } : null;
}
