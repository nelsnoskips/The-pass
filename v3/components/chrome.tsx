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
    <header className="o-bar fixed inset-x-0 top-0 z-50 border-b border-rule bg-[color-mix(in_srgb,var(--paper)_96%,transparent)] ">
      <div className="grid h-[68px] grid-cols-[1fr_auto_1fr] items-center px-[var(--rail-pad)] pr-5 lg:pr-10">
        <a href="#top" aria-label={`${ORRAVAN.name} home`} className="shrink-0">
          <Logo className="h-8" />
        </a>

        <nav className="hidden items-center justify-center gap-8 lg:flex" aria-label="Main">
          {NAV.menus.map((menu) => (
            <button
              key={menu}
              type="button"
              className="o-ui flex items-center gap-1.5 text-[10px] text-ink-soft transition-colors hover:text-[var(--orravan-blue)]"
            >
              {menu}
              <svg viewBox="0 0 8 5" className="w-2.5 opacity-40" aria-hidden>
                <path d="M0 0 L4 5 L8 0" fill="currentColor" />
              </svg>
            </button>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2.5">
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

      {/* The practice row, as in the reference. */}
      <div className="hidden border-t border-rule/70 lg:block">
        <div className="mx-auto flex max-w-[1600px] justify-center gap-14 px-10 py-2">
          {NAV.quick.map((item) => (
            <a
              key={item}
              href="#services"
              className="o-ui text-[10px] text-ink-mute transition-colors hover:text-[var(--orravan-blue)]"
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}

/** The official mark, with the script wordmark standing in until the
    artwork resolves — the bar is never waiting on a file. */
export function Logo({ className, reverse = false }: { className?: string; reverse?: boolean }) {
  const mark = IMAGES[reverse ? "logo-reverse" : "logo-light"];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset(mark.src)} alt={mark.alt} className={className} />
  );
}

export function Footer() {
  return (
    <footer id="close" className="bg-paper text-ink pt-16 lg:pt-24">
      <div className="grid gap-10 px-[var(--rail-pad)] pb-12 pr-5 lg:grid-cols-[var(--rail-w)_auto_auto_auto] lg:gap-14">
        {/* The closing line sits in the footer band, as in the reference. */}
        <h2 className="o-display self-start text-[clamp(2rem,3.4vw,3.4rem)] leading-[0.9] tracking-[0.004em]">
          <span className="block">What could your</span>
          <span className="block">building do better?</span>
        </h2>

        {FOOTER.columns.map((column) => (
          <div key={column.title}>
            <p className="o-ui text-[10px] text-ink-mute">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link}>
                  <a href="#top" className="text-[13px] text-ink-soft transition-colors hover:text-[var(--orravan-blue)]">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <a href={`tel:${ORRAVAN.phone.replace(/\D/g, "")}`} className="block text-[13px] text-ink-soft hover:text-[var(--orravan-blue)]">
            {ORRAVAN.phone}
          </a>
          <a href={`mailto:${ORRAVAN.email}`} className="mt-2 block text-[13px] text-ink-soft hover:text-[var(--orravan-blue)]">
            {ORRAVAN.email}
          </a>
          <p className="mt-5 text-[12px] leading-relaxed text-ink-mute">{FOOTER.copyright}</p>
          <ul className="mt-5 flex gap-4">
            {FOOTER.social.map((name) => (
              <li key={name}>
                <a href="#top" aria-label={name} className="text-ink-soft transition-colors hover:text-[var(--orravan-blue)]">
                  <SocialIcon name={name} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    LinkedIn: "M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.4c0-1.29-.02-2.95-1.9-2.95-1.9 0-2.2 1.4-2.2 2.85V21h-4z",
    YouTube: "M23 12s0-3.5-.45-5.17a2.9 2.9 0 0 0-2.04-2.05C18.84 4.33 12 4.33 12 4.33s-6.84 0-8.51.45A2.9 2.9 0 0 0 1.45 6.83C1 8.5 1 12 1 12s0 3.5.45 5.17a2.9 2.9 0 0 0 2.04 2.05c1.67.45 8.51.45 8.51.45s6.84 0 8.51-.45a2.9 2.9 0 0 0 2.04-2.05C23 15.5 23 12 23 12zM9.8 15.3V8.7l5.7 3.3z",
    X: "M17.5 3h3.2l-7 8 8.3 10h-6.5l-5-6.2L4.6 21H1.4l7.5-8.6L1 3h6.7l4.6 5.7zm-1.1 16h1.8L7.7 4.9H5.8z",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}
