import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/studio/session";
import { getProposal } from "@/lib/studio/proposals";
import { listClients } from "@/lib/studio/clients";
import { saveProposalAction } from "@/lib/studio/actions";
import { isConfigured } from "@/lib/db";
import "../../studio.css";

export const metadata: Metadata = {
  title: "New proposal | The Pass",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * The generator. Deliberately a plain form posting to a server action:
 * a quote is written once, read by one person, and then sent. Live
 * preview and drag-to-reorder would be work spent on the ten seconds
 * before the send rather than on the document itself.
 *
 * Five empty line-item rows because that is more than any quote so far
 * has used, and blank ones are dropped on save.
 */
export default async function NewProposal({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; taken?: string }>;
}) {
  if (!isConfigured()) redirect("/studio/login");
  if (!(await getSessionEmail())) redirect("/studio/login");

  const { slug, taken } = await searchParams;
  const [existing, clients] = await Promise.all([
    slug ? getProposal(slug) : Promise.resolve(null),
    listClients(),
  ]);
  const rows = existing?.line_items?.length ? existing.line_items : [];
  const blanks = Math.max(0, 5 - rows.length);

  return (
    <div className="st-shell">
      <div className="st-wrap" style={{ maxWidth: 820 }}>
        <header className="st-top">
          <div>
            <p className="st-eyebrow">Studio</p>
            <h1>{existing ? "Edit proposal" : "New proposal"}</h1>
          </div>
          <Link href="/studio">Back</Link>
        </header>

        {taken && (
          <p className="st-error" style={{ marginBottom: ".8rem" }}>
            &ldquo;{taken}&rdquo; is already a hand-built page at /proposals/{taken}, which would
            shadow this one. Give the company a slightly different name, or edit that page
            directly.
          </p>
        )}

        <form className="st-form" action={saveProposalAction}>
          {existing && <input type="hidden" name="slug" value={existing.slug} />}

          <div className="st-card">
            <div className="st-form">
              <div className="st-two">
                <label className="st-field">
                  <span>Company</span>
                  <input name="company" required defaultValue={existing?.company ?? ""} placeholder="Rebellion" />
                </label>
                <label className="st-field">
                  <span>Contact first name</span>
                  <input name="contact_name" defaultValue={existing?.contact_name ?? ""} placeholder="Leave blank to omit" />
                </label>
              </div>

              <label className="st-field">
                <span>Client</span>
                <select name="client_id" defaultValue={existing?.client_id ?? ""}>
                  <option value="">Not linked to a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="st-field">
                <span>Headline</span>
                <input name="headline" required defaultValue={existing?.headline ?? ""} placeholder="A new site, and someone to run it" />
              </label>

              <label className="st-field">
                <span>Opening line</span>
                <textarea name="intro" rows={2} defaultValue={existing?.intro ?? ""} placeholder="Here's the whole thing on one page…" />
              </label>

              <div className="st-two">
                <label className="st-field">
                  <span>Monthly fee</span>
                  <input name="monthly_fee" inputMode="decimal" defaultValue={existing?.monthly_fee ?? ""} placeholder="200" />
                </label>
                <label className="st-field">
                  <span>Valid for (days)</span>
                  <input name="valid_days" inputMode="numeric" defaultValue={existing?.valid_days ?? 30} />
                </label>
              </div>
            </div>
          </div>

          <div className="st-card">
            <h2>Pricing table</h2>
            <p className="st-note" style={{ margin: ".4rem 0 .8rem" }}>
              Item, what it lists at, what they pay. Tick the box to render their price as
              the green Included chip. Blank rows are dropped.
            </p>
            <div className="st-items">
              <div className="st-item st-eyebrow">
                <span>Item</span><span>List</span><span>Yours</span><span>Incl.</span>
              </div>
              {[...rows, ...Array.from({ length: blanks }, () => null)].map((r, i) => (
                <div className="st-item" key={i}>
                  <input name="item_label" defaultValue={r?.item ?? ""} placeholder={i === 0 ? "The new site build" : ""} />
                  <input name="item_list" defaultValue={r?.list ?? ""} placeholder={i === 0 ? "$3,000–$4,000" : ""} />
                  <input name="item_yours" defaultValue={r?.yours ?? ""} placeholder={i === 0 ? "Included" : ""} />
                  <input type="checkbox" name="item_highlight" value={String(i)} defaultChecked={r?.highlight ?? false} aria-label="Render as included chip" />
                </div>
              ))}
            </div>
          </div>

          <div className="st-card">
            <div className="st-form">
              <label className="st-field">
                <span>What&rsquo;s included</span>
                <textarea name="includes" rows={2} defaultValue={existing?.includes ?? ""} placeholder="Hosting, security, menu and hours updates…" />
              </label>
              <label className="st-field">
                <span>Fine print under the table</span>
                <input name="footnote" defaultValue={existing?.footnote ?? ""} placeholder="Month to month, nothing upfront." />
              </label>
              <label className="st-field">
                <span>Pull quote</span>
                <textarea name="pullquote" rows={2} defaultValue={existing?.pullquote ?? ""} placeholder="Put plainly: …" />
              </label>
            </div>
          </div>

          <button className="st-btn" type="submit">
            {existing ? "Save and view" : "Generate and view"}
          </button>
        </form>
      </div>
    </div>
  );
}
