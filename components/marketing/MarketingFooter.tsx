import Link from "next/link";
import { Wordmark } from "./PassMark";

export function MarketingFooter() {
  return (
    <footer className="bg-[#0A0A09] px-5 pb-10 pt-20 sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-start justify-between gap-10 border-b border-[#B79A68]/20 pb-14">
          <div>
            <Wordmark tone="light" />
            <p className="mt-5 max-w-[300px] text-[13.5px] leading-relaxed text-[#F1EDE5]/50">
              Restaurant growth, conducted. Strategy, technology, media, and
              conversion — one complete guest experience.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-16 gap-y-3 sm:grid-cols-3">
            {[
              ["Growth Management", "#growth-management"],
              ["Digital Experiences", "#digital-experiences"],
              ["The Pass Platform", "#the-pass"],
              ["Work", "#work"],
              ["About", "#about"],
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
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-[13px] text-[#F1EDE5]/60 transition-colors hover:text-[#F1EDE5]"
            >
              <span aria-hidden className="h-1 w-1 rounded-full bg-[#83A978]" />
              Client Login
            </Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="text-[11.5px] text-[#F1EDE5]/35">
            © {new Date().getFullYear()} Madison Four. All rights reserved.
          </p>
          <p className="mk-label text-[#B79A68]/60">
            Every detail, considered.
          </p>
        </div>
      </div>
    </footer>
  );
}
