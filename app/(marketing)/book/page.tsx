import type { Metadata } from "next";
import { CalEmbed } from "@/components/marketing/CalEmbed";

export const metadata: Metadata = {
  title: "Book a First Look — The Pass by Madison Four",
  description:
    "Fifteen minutes on your restaurant's website: what's working, what isn't, and what we'd do with it. Free, no obligation.",
  alternates: { canonical: "https://madisonfour.com/book" },
};

/**
 * The booking page. Outreach and print link madisonfour.com/book; the
 * calendar is embedded here rather than redirected to so the whole
 * journey stays on-domain and measurable.
 */
export default function BookPage() {
  return (
    <>
      <section className="bg-[#0A0A09]">
        <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-36 text-center sm:px-8 sm:pt-40">
          <p className="mk-label text-[#B79A68]">
            The First Look · 15 minutes · No obligation
          </p>
          <h1 className="mx-auto mt-5 max-w-[760px] font-editorial text-[clamp(34px,5.5vw,64px)] leading-[1.05] text-[#F1EDE5]">
            Bring your restaurant.
            <br />
            <em className="italic text-[#B79A68]">
              We&apos;ll bring what we&apos;d do with it.
            </em>
          </h1>
          <p className="mx-auto mt-7 max-w-[520px] text-[15px] leading-relaxed text-[#F1EDE5]/70">
            We&apos;ll look at your current website the way a chef looks at a
            plate before it leaves the kitchen. If it&apos;s useful, we&apos;ll
            follow up with one designed page — seen, not imagined.
          </p>
        </div>
      </section>
      <section className="bg-[#F1EDE5] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1100px]">
          {/* What-to-expect strip: reassurance beside the calendar lifts
              completed bookings — say what happens, with whom, and after. */}
          <div className="mb-14 grid gap-x-12 gap-y-8 text-[#0A0A09] sm:grid-cols-3">
            {[
              [
                "The fifteen minutes",
                "We pull up your current website together and walk through it: what's working, what's costing you guests, and what we'd change first. No slides, no pitch deck.",
              ],
              [
                "Who you'll meet",
                "Nelson — the studio's founder, based in Torrance, with over ten years in marketing and creative design. You talk to the person who'd do the work.",
              ],
              [
                "What happens after",
                "If it's useful, we follow up with one designed page of your site — seen, not imagined. If it's not a fit, you keep the notes. No obligation either way.",
              ],
            ].map(([title, body]) => (
              <div key={title} className="border-t border-[#0A0A09]/15 pt-5">
                <h2 className="mk-label text-[#4B1719]">{title}</h2>
                <p className="mt-3 text-[14px] leading-relaxed text-[#1A1310]/75">
                  {body}
                </p>
              </div>
            ))}
          </div>
          <CalEmbed />
        </div>
      </section>
    </>
  );
}
