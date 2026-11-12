import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { optKeyword, twilioSignature, verifyTwilioSignature } from "@/lib/messaging/inbound";

/**
 * Twilio's request signature: HMAC-SHA1 (auth token as key) over the full
 * URL followed by every POST parameter's name and value, sorted by name,
 * base64-encoded. The expected value here is computed from that recipe
 * directly, with the concatenation written out by hand.
 */
describe("Twilio signature", () => {
  const token = "12345";
  const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
  const params: [string, string][] = [
    ["To", "+18005551212"], ["From", "+12349013030"], ["Digits", "1234"], ["CallSid", "CA1234567890ABCDE"], ["Caller", "+12349013030"],
  ];
  const signed = url + "CallSidCA1234567890ABCDE" + "Caller+12349013030" + "Digits1234" + "From+12349013030" + "To+18005551212";
  const expected = createHmac("sha1", token).update(signed).digest("base64");

  it("matches the documented recipe", () => {
    expect(twilioSignature(url, params, token)).toBe(expected);
    // Order of the posted fields doesn't matter; they're sorted.
    expect(twilioSignature(url, [...params].reverse(), token)).toBe(expected);
  });

  it("accepts the right signature and rejects anything else", () => {
    expect(verifyTwilioSignature(url, params, expected, token)).toBe(true);
    expect(verifyTwilioSignature(url, params, null, token)).toBe(false);
    expect(verifyTwilioSignature(url, params, expected, undefined)).toBe(false);
    expect(verifyTwilioSignature(url, params, expected, "other-token")).toBe(false);
    expect(verifyTwilioSignature(`${url}&x=1`, params, expected, token)).toBe(false);
    expect(verifyTwilioSignature(url, [...params, ["Body", "STOP"]], expected, token)).toBe(false);
    expect(verifyTwilioSignature(url, params, expected.slice(0, -2), token)).toBe(false);
  });

  it("reads opt-out and opt-in keywords, and nothing else", () => {
    for (const w of ["STOP", "stop", " Stop. ", "STOPALL", "unsubscribe", "Cancel", "END", "quit!"]) expect(optKeyword(w)?.kind).toBe("stop");
    for (const w of ["START", "unstop", "Start "]) expect(optKeyword(w)?.kind).toBe("start");
    for (const w of ["please stop texting", "STOP IT", "yes", "", "Can I cancel my booking?"]) expect(optKeyword(w)).toBeNull();
  });
});
