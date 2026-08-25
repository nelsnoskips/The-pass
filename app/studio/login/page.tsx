import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionEmail, allowedEmails } from "@/lib/studio/session";
import { isConfigured } from "@/lib/db";
import { mailConfigured } from "@/lib/email";
import "../studio.css";

export const metadata: Metadata = {
  title: "Studio sign in | The Pass",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudioLogin({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  if (await getSessionEmail()) redirect("/studio");

  const configured = isConfigured();
  const anyone = allowedEmails().length > 0;

  return (
    <div className="st-shell st-login">
      <div className="st-card st-login-card">
        <p className="st-eyebrow">The Pass</p>
        <h2 style={{ marginTop: ".3rem" }}>Studio</h2>

        {!configured ? (
          <p className="st-note" style={{ marginTop: ".9rem" }}>
            No database is connected yet. Set <code>DATABASE_URL</code>, run{" "}
            <code>npm run db:migrate</code>, and this page will start working.
          </p>
        ) : !anyone ? (
          <p className="st-note" style={{ marginTop: ".9rem" }}>
            Nobody is allowed in yet. Set <code>STUDIO_ALLOWED_EMAILS</code> to your address.
          </p>
        ) : sent ? (
          <>
            <p className="st-ok" style={{ marginTop: ".9rem" }}>
              If that address is on the list, a link is on its way. It works once and
              expires in twenty minutes.
            </p>
            {!mailConfigured() && (
              <p className="st-note" style={{ marginTop: ".6rem" }}>
                No mail provider is configured, so the link was written to the server log
                instead of sent.
              </p>
            )}
          </>
        ) : (
          <form className="st-form" method="post" action="/api/studio/login" style={{ marginTop: ".9rem" }}>
            {error && <p className="st-error">That link was already used, or it expired.</p>}
            <label className="st-field">
              <span>Email</span>
              <input name="email" type="email" required autoComplete="email" placeholder="you@madisonfour.com" />
            </label>
            <button className="st-btn" type="submit">Send me a link</button>
            <p className="st-note">No password. The link signs you in and lasts thirty days.</p>
          </form>
        )}
      </div>
    </div>
  );
}
