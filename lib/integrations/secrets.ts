import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Encryption for provider credentials at rest, and signed state for
 * OAuth round trips.
 *
 *   INTEGRATIONS_KEY — 32 random bytes, base64. Generate with
 *   `openssl rand -base64 32`. Losing it means restaurants reconnect;
 *   leaking it means rotating it and reconnecting.
 */

function key(): Buffer {
  const raw = process.env.INTEGRATIONS_KEY?.trim();
  if (!raw) throw new Error("INTEGRATIONS_KEY is not set.");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("INTEGRATIONS_KEY must be 32 bytes, base64.");
  return k;
}

export function integrationsKeyConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext>, base64url. */
export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv, c.getAuthTag(), body].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function open(sealed: string): string {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || body === undefined) throw new Error("Unreadable secret.");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}

/** OAuth state: which org asked, when, signed so a callback can't be forged for another org. */
export function signState(payload: { org: string; provider: string }, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...payload, t: now })).toString("base64url");
  const mac = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function readState(state: string, now = Date.now(), maxAgeMs = 15 * 60_000): { org: string; provider: string } | null {
  const [body, mac] = state.split(".");
  if (!body || !mac) return null;
  const want = createHmac("sha256", key()).update(body).digest("base64url");
  if (want.length !== mac.length || !timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { org: string; provider: string; t: number };
  if (now - p.t > maxAgeMs) return null;
  return { org: p.org, provider: p.provider };
}
