/**
 * Call a server action from a button without letting a dropped connection
 * blank the page: a network failure comes back as an inline error, and
 * whatever the person typed stays where it was.
 */
export function networkError(): string {
  return typeof navigator !== "undefined" && navigator.onLine === false
    ? "You're offline — that didn't save. Try again when you're back."
    : "Couldn't reach The Pass — nothing changed. Try again.";
}

export async function safeCall<T extends { error: string | null }>(call: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await call();
  } catch (err) {
    // Next's redirect (e.g. a signed-out session) must still navigate.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
    console.error(err);
    return { error: networkError() };
  }
}
