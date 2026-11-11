import type { Metadata } from "next";
import { db } from "@/lib/db";
import { readUnsubscribeToken, unsubscribeEmail } from "@/lib/messaging/email";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * A button, not a bare link: mail scanners open every link in a message,
 * and a GET that unsubscribed would unsubscribe people who never asked.
 */
async function confirm(form: FormData) {
  "use server";
  const id = readUnsubscribeToken(String(form.get("token") ?? ""));
  const sql = db();
  if (id && sql) await unsubscribeEmail(sql, id);
}

export default async function Unsubscribe({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const valid = Boolean(readUnsubscribeToken(token));
  const box = { maxWidth: 440, margin: "18vh auto", padding: 28, fontFamily: "system-ui, sans-serif", lineHeight: 1.5, color: "#1b1b1b" } as const;
  if (!valid) return <main style={box}><h1 style={{ fontSize: 22 }}>This link isn&rsquo;t valid.</h1><p>It may be incomplete. Reply to the email and we&rsquo;ll take you off the list.</p></main>;
  if (done) return <main style={box}><h1 style={{ fontSize: 22 }}>You&rsquo;re unsubscribed.</h1><p>You won&rsquo;t get marketing emails from this restaurant again. Booking confirmations still come by text.</p></main>;
  return (
    <main style={box}>
      <h1 style={{ fontSize: 22 }}>Stop marketing emails?</h1>
      <p>You&rsquo;ll still get messages about your own bookings.</p>
      <form action={async (f) => { "use server"; await confirm(f); const { redirect } = await import("next/navigation"); redirect(`/u/${token}?done=1`); }}>
        <input type="hidden" name="token" value={token} />
        <button style={{ font: "inherit", padding: "10px 18px", borderRadius: 8, border: "1px solid #1b1b1b", background: "#1b1b1b", color: "#fff", cursor: "pointer" }}>Unsubscribe</button>
      </form>
    </main>
  );
}
