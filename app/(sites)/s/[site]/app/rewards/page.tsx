import type { Metadata } from "next";
import Link from "next/link";
import { AppScreen } from "@/components/app/AppPage";
import { loadAppPage } from "@/components/app/load";
import { ForgetBooking, RememberBooking } from "@/components/app/RememberBooking";
import { publicProgram, rewardsForBooking } from "@/lib/app/repo";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
// Can carry a booking link: never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ site: string }>; searchParams: Promise<{ preview?: string; b?: string }> };

/** "A dessert on us." → "a dessert on us", to sit inside a sentence. */
const lowerFirst = (s: string) => { const t = s.trim().replace(/\.$/, ""); return t.charAt(0).toLowerCase() + t.slice(1); };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Rewards: the program for everyone; a guest's own progress only with
 * their booking link. Never looked up by phone number — anyone can type
 * a number.
 */
export default async function Rewards({ params, searchParams }: Props) {
  const [{ site }, { preview, b }] = await Promise.all([params, searchParams]);
  const app = await loadAppPage(site, preview);
  const sql = db()!;
  const program = await publicProgram(sql, app.site.orgId);
  const token = typeof b === "string" && b ? b.slice(0, 64) : null;
  const progress = program && token ? await rewardsForBooking(sql, app.site.orgId, token) : null;

  return (
    <AppScreen app={app} tab="rewards" title="Rewards">
      {!program ? (
        <p>We don&rsquo;t have a rewards program running right now.</p>
      ) : (
        <>
          <div className="papp-card accent">
            <p className="papp-eyebrow">How it works</p>
            <p className="papp-big">Every {program.visitsRequired} visits earns <b>{lowerFirst(program.reward)}</b>.</p>
            <p>Visits count when you dine with us under your phone number, booked or walked in. Nothing to sign up for.</p>
          </div>
          {progress ? (
            <div className="papp-card">
              <p className="papp-eyebrow">{progress.firstName ? `${progress.firstName}, your progress` : "Your progress"}</p>
              {progress.waiting ? (
                <p className="papp-big">You&rsquo;ve earned <b>{progress.waiting}</b>. Tell your server on your next visit.</p>
              ) : (
                <p className="papp-big">{progress.toNext === 1 ? "One more visit" : `${progress.toNext} more visits`} to {lowerFirst(program.reward)}.</p>
              )}
              <div className="papp-meter" role="img" aria-label={`${progress.visitsRequired - progress.toNext} of ${progress.visitsRequired} visits toward the next reward`}>
                {Array.from({ length: progress.visitsRequired }, (_, i) => (
                  <span key={i} className={i < progress.visitsRequired - progress.toNext ? "on" : undefined} />
                ))}
              </div>
              <p className="papp-note">{plural(progress.visits, "visit")} so far. Counts update after each visit.</p>
              <ForgetBooking slug={app.site.slug} />
            </div>
          ) : token ? (
            <div className="papp-card">
              <p>We couldn&rsquo;t find your progress from that link. Open the link in your latest booking text and tap <b>Open in the app</b>.</p>
            </div>
          ) : (
            <div className="papp-card">
              <p className="papp-eyebrow">Your progress</p>
              <p>Your visits are on your booking page. Open the link in your confirmation text and tap <b>Open in the app</b>: this phone will remember it.</p>
              <Link href={`${app.base}/reserve`} className="papp-btn">Book a table</Link>
            </div>
          )}
          {!app.draft && <RememberBooking slug={app.site.slug} token={token} valid={Boolean(progress)} />}
        </>
      )}
    </AppScreen>
  );
}
