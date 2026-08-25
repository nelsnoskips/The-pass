import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/studio/session";
import { addClientAction } from "@/lib/studio/actions";
import { isConfigured } from "@/lib/db";
import "../../studio.css";

export const metadata: Metadata = { title: "New client | The Pass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewClient() {
  if (!isConfigured()) redirect("/studio/login");
  if (!(await getSessionEmail())) redirect("/studio/login");

  return (
    <div className="st-shell">
      <div className="st-wrap" style={{ maxWidth: 640 }}>
        <header className="st-top">
          <div>
            <p className="st-eyebrow">Studio</p>
            <h1>New client</h1>
          </div>
          <Link href="/studio">Back</Link>
        </header>

        <form className="st-form" action={addClientAction}>
          <div className="st-card">
            <div className="st-form">
              <label className="st-field">
                <span>Client name</span>
                <input name="name" required placeholder="Rebellion" />
              </label>
              <div className="st-two">
                <label className="st-field">
                  <span>Contact</span>
                  <input name="contact_name" placeholder="First name" />
                </label>
                <label className="st-field">
                  <span>Contact email</span>
                  <input name="contact_email" type="email" />
                </label>
              </div>
              <label className="st-field">
                <span>Segment</span>
                <input name="segment" placeholder="Restaurant" />
              </label>
            </div>
          </div>

          <div className="st-card">
            <h2>First project</h2>
            <p className="st-note" style={{ margin: ".4rem 0 .8rem" }}>
              Optional. The mock path is where the built site lives on this domain, e.g.
              <code> /spec/orravan</code> — that is what the review link frames.
            </p>
            <div className="st-form">
              <label className="st-field">
                <span>Project name</span>
                <input name="project_name" placeholder="Rebellion website" />
              </label>
              <div className="st-two">
                <label className="st-field">
                  <span>Mock path</span>
                  <input name="mock_path" placeholder="/spec/rebellion" />
                </label>
                <label className="st-field">
                  <span>Monthly fee</span>
                  <input name="monthly_fee" inputMode="decimal" placeholder="200" />
                </label>
              </div>
            </div>
          </div>

          <button className="st-btn" type="submit">Add client</button>
        </form>
      </div>
    </div>
  );
}
