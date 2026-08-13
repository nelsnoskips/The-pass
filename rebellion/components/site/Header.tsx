"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logotype } from "@/components/ui/Brand";
import { nav, site } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Blueprint §07: "Navigation changes from transparent to bone/ink after the
 * first scroll, preserving contrast in every frame."
 *
 * Pages without a full-bleed hero opt out with `overlay={false}` and get the
 * solid bar immediately.
 */
export function Header({ overlay = false }: { overlay?: boolean }) {
  const [scrolled, setScrolled] = useState(!overlay);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  // Close the mobile drawer when the route changes. Adjusting state during
  // render (rather than in an effect) avoids a second paint with the old menu
  // still open.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-[var(--dur-ui)] ease-[var(--ease-ui)]",
        solid ? "bg-bone/95 backdrop-blur-sm" : "bg-gradient-to-b from-ink/70 to-transparent",
      )}
    >
      <div className="flex h-20 items-center justify-between pl-4 pr-4 md:h-[88px] md:pl-6 md:pr-6">
        {/* The logotype sits on its own bone plate so the 1C artwork keeps its
            contrast over any hero frame. */}
        <Link
          href="/"
          aria-label={`${site.shortName} — home`}
          className="relative z-10 -mt-0 block bg-bone px-4 py-3 shadow-[0_2px_24px_rgb(24_24_23/0.18)] transition-transform duration-[var(--dur-micro)] ease-[var(--ease-ui)] hover:-translate-y-px md:absolute md:top-0 md:left-6 md:px-5 md:py-6"
        >
          <Logotype priority className="w-[132px] md:w-[168px]" />
        </Link>

        <nav
          aria-label="Primary"
          className="mx-auto hidden items-center gap-8 lg:flex"
        >
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "micro group relative py-2 transition-colors duration-[var(--dur-micro)]",
                  solid ? "text-ink hover:text-oxblood" : "text-bone hover:text-white",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-oxblood transition-transform duration-[var(--dur-micro)] ease-[var(--ease-ui)] group-hover:scale-x-100",
                    active ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={site.reserveUrl}
            className="micro hidden bg-oxblood px-8 py-4 text-bone transition-colors duration-[var(--dur-micro)] hover:bg-[#8d343d] sm:inline-flex"
          >
            Reserve
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center lg:hidden",
              solid ? "text-ink" : "text-bone",
            )}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile: tap-first, no hover-dependent information (blueprint §08). */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-rule bg-bone lg:hidden"
      >
        <nav aria-label="Primary mobile" className="flex flex-col px-6 py-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="display border-b border-rule py-4 text-3xl text-ink last:border-0"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={site.reserveUrl}
            className="micro mt-5 bg-oxblood px-6 py-4 text-center text-bone"
          >
            Reserve a table
          </Link>
          <a
            href={site.phoneHref}
            className="micro-wide py-4 text-center text-ink-mute"
          >
            {site.phone}
          </a>
        </nav>
      </div>
    </header>
  );
}
