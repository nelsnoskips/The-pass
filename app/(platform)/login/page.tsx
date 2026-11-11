import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/platform/session";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  if (await currentIdentity()) redirect("/r");
  return (
    <main className="pf-login">
      <form className="pf-login-card" method="post" action="/api/platform/login">
        <div>
          <p className="pf-mark" style={{ margin: "0 0 14px" }}>The Pass</p>
          <h1>Sign in to your restaurant</h1>
        </div>
        {sent ? (
          <p className="pf-msg ok">If that address belongs to a restaurant team, a sign-in link is on its way. It works once and expires in 20 minutes.</p>
        ) : (
          <>
            {error && <p className="pf-msg err">That link has expired or was already used. Ask for a new one.</p>}
            <div className="pf-field">
              <label htmlFor="email">Work email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <button className="pf-btn primary" type="submit">Email me a sign-in link</button>
            <p className="pf-sub" style={{ margin: 0 }}>No password. We email you a link that signs you in on this device.</p>
          </>
        )}
      </form>
    </main>
  );
}
