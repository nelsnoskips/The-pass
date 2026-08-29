"use client";

import { FOOTER, NAV, ORRAVAN } from "@/lib/site";
import { IMAGES, asset } from "@/lib/images";

/**
 * The bar waits for the entrance. Until the plate hands the page over
 * (`html[data-entered="true"]`), it is invisible and untouchable; from
 * then on it is an ordinary sticky header.
 */
export function TopBar() {
  return (
    <header className="o-bar fixed inset-x-0 top-0 z-50 border-b border-rule bg-[rgba(247,245,239,0.93)] backdrop-blur-sm">
      <div className="mx-auto flex h-[64px] max-w-[1600px] items-center gap-8 px-5 lg:px-10">
        <a href="#top" aria-label={`${ORRAVAN.name} home`} className="shrink-0">
          <Logo className="h-7" />
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.menus.map((menu) => (
            <button
              key={menu}
              type="button"
              className="o-label flex items-center gap-1.5 text-[10px] text-ink-soft transition-colors hover:text-[var(--orravan-blue)]"
            >
              {menu}
              <svg viewBox="0 0 8 5" className="w-2.5 opacity-40" aria-hidden>
                <path d="M0 0 L4 5 L8 0" fill="currentColor" />
              </svg>
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <a
            href="#record"
            className="hidden min-h-[38px] items-center border border-ink/25 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink/5 sm:inline-flex"
          >
            {NAV.portal}
          </a>
          <a
            href="#close"
            className="inline-flex min-h-[38px] items-center bg-[var(--orravan-blue)] px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
          >
            {NAV.request}
          </a>
        </div>
      </div>
    </header>
  );
}

/** The official mark, with the script wordmark standing in until the
    artwork resolves — the bar is never waiting on a file. */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(IMAGES.logo.src)}
      alt={ORRAVAN.name}
      className={className}
      style={light ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
}

export function Footer() {
  return (
    <footer className="bg-[#111214] text-bone">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-5 py-14 lg:grid-cols-[minmax(240px,320px)_1fr] lg:px-10">
        <div>
          <Logo light className="h-8" />
          <p className="o-label mt-5 text-[9.5px] leading-relaxed text-bone/45">
            Automation · HVAC · Monitoring · Inventory
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-[repeat(2,minmax(0,1fr))_auto]">
          {FOOTER.columns.map((column) => (
            <div key={column.title}>
              <p className="o-label text-[9.5px] text-bone/50">{column.title}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#top" className="text-[13px] text-bone/75 transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="sm:text-right">
            <a href={`tel:${ORRAVAN.phone.replace(/\D/g, "")}`} className="block text-[13px] text-bone/75 hover:text-white">
              {ORRAVAN.phone}
            </a>
            <a href={`mailto:${ORRAVAN.email}`} className="mt-2 block text-[13px] text-bone/75 hover:text-white">
              {ORRAVAN.email}
            </a>
            <ul className="mt-4 flex gap-2 sm:justify-end">
              {FOOTER.social.map((name) => (
                <li key={name}>
                  <a
                    href="#top"
                    aria-label={name}
                    className="flex h-8 w-8 items-center justify-center border border-bone/20 text-[10px] text-bone/70 transition-colors hover:border-bone/50 hover:text-white"
                  >
                    {name === "LinkedIn" ? "in" : name === "YouTube" ? "▶" : "✕"}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-bone/10">
        <div className="mx-auto flex max-w-[1600px] flex-wrap justify-between gap-3 px-5 py-4 text-[11px] text-bone/45 lg:px-10">
          <span>© {ORRAVAN.name}. All rights reserved. {ORRAVAN.license}</span>
          <span className="flex gap-5">
            <a href="#top" className="hover:text-bone/80">Privacy Policy</a>
            <a href="#top" className="hover:text-bone/80">Terms of Use</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
