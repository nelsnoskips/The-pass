import Link from "next/link";
import { Wordmark } from "./PassMark";

/* Drawn rather than imported: one glyph does not justify an icon
   dependency, and this one inherits currentColor so it dims and lifts
   with the link it sits in. */
function InstagramMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-[#0A0A09] px-5 pb-10 pt-20 sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-start justify-between gap-10 border-b border-[#B79A68]/20 pb-14">
          <div>
            <Wordmark tone="light" />
            <p className="mt-5 max-w-[300px] text-[13.5px] leading-relaxed text-[#F1EDE5]/50">
              Restaurant websites, crafted. Design, engineering, and
              discoverability in one complete guest experience.
            </p>
            <a
              href="mailto:hello@madisonfour.com"
              className="mt-5 inline-block text-[13.5px] text-[#B79A68] transition-colors hover:text-[#F1EDE5]"
            >
              hello@madisonfour.com
            </a>
            <a
              href="https://www.instagram.com/thepass_madisonfour/"
              target="_blank"
              rel="me noreferrer"
              className="mt-3 flex w-fit items-center gap-2 text-[13.5px] text-[#F1EDE5]/60 transition-colors hover:text-[#F1EDE5]"
            >
              <InstagramMark />
              @thepass_madisonfour
            </a>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-16 gap-y-3 sm:grid-cols-3">
            {[
              ["The Craft", "#craft"],
              ["Digital Experiences", "#digital-experiences"],
              ["Our Story", "#about"],
              ["Request a Consultation", "#consultation"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-[13px] text-[#F1EDE5]/60 transition-colors hover:text-[#F1EDE5]"
              >
                {label}
              </a>
            ))}
            {[
              ["Book a First Look", "/book"],
              ["vs SpotHopper", "/vs/spothopper"],
              ["vs Owner.com", "/vs/owner"],
              ["vs BentoBox", "/vs/bentobox"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-[13px] text-[#F1EDE5]/60 transition-colors hover:text-[#F1EDE5]"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/portal"
              className="flex items-center gap-1.5 text-[13px] text-[#F1EDE5]/60 transition-colors hover:text-[#F1EDE5]"
            >
              <span aria-hidden className="h-1 w-1 rounded-full bg-[#83A978]" />
              Client Login
            </Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <p className="text-[11.5px] text-[#F1EDE5]/35">
              © {new Date().getFullYear()} Madison Four. All rights reserved.
            </p>
            <Link
              href="/privacy"
              className="text-[11.5px] text-[#F1EDE5]/35 transition-colors hover:text-[#F1EDE5]/70"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-[11.5px] text-[#F1EDE5]/35 transition-colors hover:text-[#F1EDE5]/70"
            >
              Terms
            </Link>
          </div>
          <p className="mk-label text-[#B79A68]/60">
            Every detail, considered.
          </p>
        </div>
      </div>
    </footer>
  );
}
