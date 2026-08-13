"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { happenings, images } from "@/lib/site";
import { ArrowLink } from "@/components/ui/Button";
import { Bloom } from "@/components/ui/Artwork";
import { Logotype } from "@/components/ui/Brand";
import { eventDate } from "@/lib/utils";

/**
 * Module 03 — the happenings rail (blueprint §07/§08).
 *
 * Native scroll-snap does the physics, which keeps swipe, momentum, keyboard
 * and screen-reader order correct for free. Arrows are real buttons with
 * disabled states; nothing autoplays.
 */
export function HappeningsRail() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.6), behavior: "smooth" });
  };

  return (
    <section
      aria-labelledby="happenings-heading"
      className="paper-grain relative overflow-hidden bg-bone"
    >
      {/* The logotype sits in the paper like a printer's watermark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -left-24 w-[380px] opacity-[0.035] select-none"
      >
        <Logotype />
      </div>
      <Bloom
        variant="c"
        opacity={50}
        className="-top-24 right-[6%] h-[340px] w-[380px] text-wash-sage"
      />

      <div className="relative flex flex-col gap-6 px-6 py-14 md:px-10 lg:flex-row lg:items-center lg:gap-10">
        <div className="shrink-0 lg:w-56">
          <h2 id="happenings-heading" className="display text-3xl">
            Happenings
          </h2>
          <p className="mt-3 text-sm text-ink-mute">
            What&apos;s coming up at Rebellion.
          </p>
          <div className="mt-5">
            <ArrowLink href="/happenings">View calendar</ArrowLink>
          </div>
        </div>

        <ul
          ref={trackRef}
          tabIndex={0}
          aria-label="Upcoming happenings"
          className="no-scrollbar flex flex-1 snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
        >
          {happenings.map((event) => {
            const date = eventDate(event.date);
            const img = images[event.image];
            return (
              <li
                key={event.slug}
                className="group w-[300px] shrink-0 snap-start sm:w-[340px]"
              >
                <Link
                  href={`/happenings#${event.slug}`}
                  className="flex h-full items-stretch gap-4"
                >
                  <time
                    dateTime={date.iso}
                    className="flex w-12 shrink-0 flex-col items-center pt-1 text-oxblood"
                  >
                    <span className="micro">{date.month}</span>
                    <span className="display text-3xl leading-none">
                      {date.day}
                    </span>
                    <span className="micro mt-1 text-ink-mute">
                      {date.weekday}
                    </span>
                  </time>

                  <span className="art-frame relative block aspect-[4/3] w-[132px] shrink-0 overflow-hidden">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="132px"
                      className="object-cover transition-transform duration-[var(--dur-editorial)] ease-[var(--ease-expressive)] group-hover:scale-[1.05]"
                    />
                  </span>

                  <span className="flex min-w-0 flex-col justify-center">
                    <span className="micro text-oxblood">{event.kind}</span>
                    <span className="mt-1 block font-semibold">
                      {event.title}
                    </span>
                    <span className="mt-1 block text-xs text-ink-mute">
                      {event.time}
                    </span>
                    {event.ticketed && (
                      <span className="micro mt-2 self-start border border-brass/60 px-2 py-1 text-brass">
                        Ticketed
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 gap-2 self-end lg:self-center">
          {[
            { dir: -1 as const, Icon: ChevronLeft, label: "Previous happenings", off: atStart },
            { dir: 1 as const, Icon: ChevronRight, label: "More happenings", off: atEnd },
          ].map(({ dir, Icon, label, off }) => (
            <button
              key={label}
              type="button"
              onClick={() => nudge(dir)}
              disabled={off}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/25 text-ink transition-colors duration-[var(--dur-micro)] hover:border-ink hover:bg-ink hover:text-bone disabled:pointer-events-none disabled:opacity-30"
            >
              <span className="sr-only">{label}</span>
              <Icon size={18} aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
