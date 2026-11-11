"use server";

import { db } from "../db";
import { requireTenant } from "./context";
import { searchEverything, type SearchHit } from "./search";

export async function searchAction(org: string, q: string): Promise<SearchHit[]> {
  const { tenant } = await requireTenant(org);
  return searchEverything(db()!, tenant, org, String(q ?? ""));
}
