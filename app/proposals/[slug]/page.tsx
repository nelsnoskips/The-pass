import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProposal } from "@/lib/studio/proposals";
import { isConfigured } from "@/lib/db";
import "../proposal.css";

export const dynamic = "force-dynamic";

/**
 * Generated quotes render here, off the same stylesheet as the two
 * hand-built ones, so a reader cannot tell which is which. The hand-
 * built pages keep their own routes: a quote that has already been sent
 * should not change shape because a template did.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const q = isConfigured() ? await getProposal(slug) : null;
  return {
    title: q ? `Proposal for ${q.company} | The Pass by Madison Four` : "Proposal | The Pass",
    robots: { index: false, follow: false },
    alternates: { canonical: `/proposals/${slug}` },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function GeneratedProposal({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isConfigured()) notFound();
  const q = await getProposal(slug);
  if (!q) notFound();

  const fee = q.monthly_fee ? Number(q.monthly_fee) : null;

  return (
    <div className="orv-wrap">
      <header className="orv-masthead">
        <div className="orv-brandmark">
          <svg viewBox="0 0 34 30" width="30" height="27" aria-hidden="true">
            <path d="M2 15 V2 H32 V15" fill="none" stroke="#b79a68" strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="6.4" cy="23.5" r="1.9" fill="#b79a68" />
            <circle cx="13" cy="23.5" r="1.9" fill="#b79a68" />
            <circle cx="19.6" cy="23.5" r="1.9" fill="#b79a68" />
            <circle cx="26.2" cy="23.5" r="1.9" fill="#b79a68" />
          </svg>
          <div>
            <div className="orv-name">The Pass</div>
            <div className="orv-sub">by Madison Four</div>
          </div>
        </div>
        <div className="orv-meta">
          <div className="orv-row">
            <span className="orv-label">Prepared for</span>
            {q.company}
          </div>
          <div className="orv-row">
            <span className="orv-label">Date · Valid</span>
            {formatDate(q.created_at)} · {q.valid_days} days
          </div>
        </div>
      </header>

      <section className="orv-intro" style={{ marginTop: 0 }}>
        <p className="orv-label" style={{ color: "var(--wine)" }}>Proposal</p>
        <h1>{q.headline}</h1>

        <p className="orv-greeting" style={{ marginTop: "1.8rem" }}>
          {q.contact_name ? `Hi ${q.contact_name},` : "Hi,"}
        </p>
        {q.intro && (
          <div className="orv-prose">
            <p>{q.intro}</p>
          </div>
        )}

        <div className="orv-context">
          <p className="orv-label">A note on the numbers</p>
          <div className="orv-prose">
            <p>
              The studio lists at <strong>$3,000&ndash;$4,000</strong> for a custom build and{" "}
              <strong>$900 a month</strong> for ongoing care. That&rsquo;s public on our site, and
              I&rsquo;d rather tell you myself than have you find it and wonder which number is
              real. What&rsquo;s below is a partner rate &mdash; what I&rsquo;d charge <em>you</em>,
              not what the work lists at.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="orv-options">
          <div className="orv-option orv-b" style={{ gridColumn: "1 / -1" }}>
            <p className="orv-kicker">The offer</p>
            <h2>Everything, one number</h2>
            {fee !== null && (
              <p className="orv-rate">
                ${fee.toLocaleString("en-US")}
                <span className="orv-cadence"> / month</span>
              </p>
            )}

            {q.line_items.length > 0 && (
              <table className="orv-pricing">
                <caption>Pricing: list price versus your rate</caption>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">List</th>
                    <th scope="col">Yours</th>
                  </tr>
                </thead>
                <tbody>
                  {q.line_items.map((r) => (
                    <tr key={r.item}>
                      <td>{r.item}</td>
                      <td className="orv-list-price">{r.list}</td>
                      <td className="orv-your-price">
                        {r.highlight ? <span className="orv-incl">{r.yours}</span> : r.yours}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {q.includes && (
              <div className="orv-includes">
                <p>{q.includes}</p>
              </div>
            )}
            {q.footnote && <p className="orv-fine">{q.footnote}</p>}
          </div>
        </div>

        {q.pullquote && (
          <div className="orv-pullquote">
            <p>{q.pullquote}</p>
          </div>
        )}
      </section>

      <section>
        <div className="orv-section-head">
          <p className="orv-label">Next</p>
          <div className="orv-hr"></div>
        </div>
        <div className="orv-prose">
          <p>
            If the number works, say so and I&rsquo;ll start. Happy to get on a call first if
            you&rsquo;d rather see it before you decide.
          </p>
        </div>

        <div className="orv-cta-row">
          <a
            className="orv-btn"
            href={`mailto:nelson.schnebelen@gmail.com?subject=${encodeURIComponent(`Re: Proposal — ${q.company}`)}`}
          >
            Reply to this quote
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a className="orv-btn orv-ghost" href="https://madisonfour.com/book" target="_blank" rel="noopener">
            Or book a call
          </a>
        </div>

        <div className="orv-sign">
          <p className="orv-name">Nelson</p>
          <p className="orv-role">The Pass by Madison Four</p>
          <p className="orv-contact">
            <a href="mailto:nelson.schnebelen@gmail.com">nelson.schnebelen@gmail.com</a>
            &nbsp;&middot;&nbsp;
            <a href="https://madisonfour.com" target="_blank" rel="noopener">madisonfour.com</a>
          </p>
        </div>
      </section>

      <footer>
        <span>The Pass by Madison Four</span>
        <span>Prepared for {q.company} &middot; not a binding invoice</span>
      </footer>
    </div>
  );
}
