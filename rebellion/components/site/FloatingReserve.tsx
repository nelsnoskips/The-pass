"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Blueprint §08, "Reservation control": the header CTA stays primary, and a
 * compact floating Reserve control appears once the hero is behind you. On
 * mobile it becomes the sticky bottom bar the blueprint asks for.
 */
export function FloatingReserve() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 p-4 transition-[opacity,transform] duration-[var(--dur-ui)] ease-[var(--ease-ui)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:p-0",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <Link
        href={site.reserveUrl}
        tabIndex={visible ? undefined : -1}
        aria-hidden={!visible}
        className="micro flex items-center justify-center bg-oxblood px-8 py-4 text-bone shadow-[0_8px_30px_rgb(24_24_23/0.35)] transition-colors duration-[var(--dur-micro)] hover:bg-[#8d343d]"
      >
        Reserve a table
      </Link>
    </div>
  );
}
