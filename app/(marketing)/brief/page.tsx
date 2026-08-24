import type { Metadata } from "next";
import { BriefForm } from "@/components/marketing/BriefForm";
import { ALL_FIELDS, CHAPTERS } from "@/lib/brief";

export const metadata: Metadata = {
  title: "Start a brief | The Pass by Madison Four",
  description:
    "Tell us what you need built. Seven short sections, every one skippable, and your brief assembles as you answer so you can read it back before you send it.",
  alternates: { canonical: "/brief" },
  openGraph: {
    title: "Start a brief — The Pass by Madison Four",
    description:
      "Seven short sections, every one skippable. Your brief writes itself as you answer.",
    url: "/brief",
    type: "website",
  },
};

/**
 * The intake page.
 *
 * The heading and the whole set of questions are server-rendered inside
 * a <noscript>, so a visitor without JavaScript gets one long ordinary
 * form posting to the same endpoint rather than an empty page. An
 * intake form that only works with JS is a lead form that silently
 * drops leads, which on a studio site is the wrong place to be clever.
 */
export default function BriefPage() {
  return (
    <main className="mk bg-[#0A0A09] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto max-w-[1400px]">
        <p className="mk-label text-[#B79A68]">The Brief</p>
        <h1 className="mt-6 max-w-[18ch] font-editorial text-[40px] leading-[1.06] text-[#F1EDE5] sm:text-[58px]">
          Tell us what you need,{" "}
          <em className="italic text-[#B79A68]">and skip what you haven&apos;t decided.</em>
        </h1>
        <p className="mt-7 max-w-[62ch] text-[16px] leading-relaxed text-[#F1EDE5]/65">
          Seven short sections. Everything except your email is optional, every
          section can be skipped in one click, and your answers are saved on
          this device as you go — so you can leave halfway through a Tuesday
          and come back on Thursday. Your brief assembles beside you as you
          answer.
        </p>
      </div>

      {/* React server-renders the guided form, so with JavaScript off it
          would still appear — stepped, with buttons that do nothing —
          right above the fallback. A style tag inside <noscript> is the
          honest fix: it only exists when scripting is off, so there is
          no flash for everyone else. */}
      <noscript>
        <style>{`.js-only { display: none }`}</style>
      </noscript>

      <div className="js-only mt-16 sm:mt-20">
        <BriefForm />
      </div>

      <noscript>
        <div className="mx-auto mt-8 max-w-[760px]">
          <p className="text-[15px] leading-relaxed text-[#F1EDE5]/65">
            The guided version needs JavaScript. Here is the whole thing as one
            form instead — answer what you like and leave the rest blank.
          </p>
          <form
            name="brief"
            method="POST"
            action="/__forms.html"
            data-netlify="true"
            className="mt-10 space-y-10"
          >
            <input type="hidden" name="form-name" value="brief" />
            {CHAPTERS.map((c) => (
              <fieldset key={c.id} className="border-t border-[#F1EDE5]/12 pt-6">
                <legend className="mk-label text-[#B79A68]">
                  {c.n} · {c.title}
                </legend>
                <div className="mt-6 space-y-6">
                  {c.fields.map((f) => (
                    <label key={f.id} className="block">
                      <span className="text-[15px] text-[#F1EDE5]">{f.label}</span>
                      {f.type === "long" ? (
                        <textarea
                          name={f.id}
                          rows={3}
                          className="mt-2 w-full border-0 border-b border-[#F1EDE5]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#F1EDE5]"
                        />
                      ) : (
                        <input
                          name={f.id}
                          type={f.type === "choice" || f.type === "multi" ? "text" : f.type}
                          required={f.required}
                          className="mt-2 w-full border-0 border-b border-[#F1EDE5]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#F1EDE5]"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              type="submit"
              className="mk-label border border-[#B79A68] bg-[#B79A68] px-7 py-4 text-[#0A0A09]"
            >
              Send the brief
            </button>
          </form>
        </div>
      </noscript>

      <p className="mx-auto mt-20 max-w-[1400px] text-[13px] text-[#F1EDE5]/35">
        {ALL_FIELDS.length} questions, none of them compulsory but one. Or skip
        the form entirely and write to{" "}
        <a href="mailto:hello@madisonfour.com" className="text-[#B79A68] hover:text-[#F1EDE5]">
          hello@madisonfour.com
        </a>
        .
      </p>
    </main>
  );
}
