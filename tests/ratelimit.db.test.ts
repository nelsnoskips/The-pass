import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { allow } from "@/lib/platform/ratelimit";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("rate limiter", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 1, onnotice: () => {} });
  afterAll(() => sql.end());

  it("allows up to the limit per subject, then refuses", async () => {
    const who = randomUUID();
    const tries = [];
    for (let i = 0; i < 4; i++) tries.push(await allow(sql, "test", who, 3, 10));
    expect(tries).toEqual([true, true, true, false]);
    expect(await allow(sql, "test", randomUUID(), 3, 10)).toBe(true);
  });

  it("never stores the raw subject", async () => {
    const who = `+1954555${Math.floor(Math.random() * 1e4)}`;
    await allow(sql, "test", who, 3, 10);
    const rows = await sql`select 1 from rate_events where key like ${`%${who}%`}`;
    expect(rows).toHaveLength(0);
  });
});
