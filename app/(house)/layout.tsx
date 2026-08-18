import type { Metadata } from "next";
import { Anton } from "next/font/google";
import Link from "next/link";
import { HOUSE } from "@/lib/house";
import "./house.css";

// Heavy condensed display face for the masthead and headlines.
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });

export const metadata: Metadata = {
  title: "HOUSE ISSUE — Neighborhood Deli, Rotisserie & Goods",
  description:
    "A Los Angeles deli and rotisserie that publishes everything it makes as an issue: seasonal menus, collaborations, and goods, numbered and archived.",
  robots: { index: false, follow: false },
};

export default function HouseLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`hse min-h-screen ${anton.variable}`}>
      {/* Before first paint, so the hero never flashes its unpinned
          height. Only a browser that runs JavaScript can scrub a video,
          and only a visitor who has not asked for less motion should be
          held in place — anyone else scrolls straight past a still. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)" +
            "document.documentElement.classList.add('hse-cine')}catch(e){}",
        }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[#14120F] focus:px-4 focus:py-2 focus:text-[#F4F1EA]"
      >
        Skip to content
      </a>
      {children}

      <footer className="hse-rule-heavy mt-24 bg-[#F4F1EA]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-4">
          <div>
            <p className="hse-display text-[30px]">House Issue</p>
            <p className="hse-label mt-3 text-[#14120F]/60">{HOUSE.descriptor}</p>
          </div>
          <div>
            <p className="hse-label text-[#14120F]/60">Find us</p>
            <p className="mt-3 text-[14px] leading-relaxed">{HOUSE.address}</p>
            <p className="hse-num mt-1 text-[14px]">{HOUSE.phone}</p>
          </div>
          <div>
            <p className="hse-label text-[#14120F]/60">Hours</p>
            <p className="mt-3 text-[14px] leading-relaxed">{HOUSE.hours}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[#14120F]/70">
              {HOUSE.kitchenNote}
            </p>
          </div>
          <div>
            <p className="hse-label text-[#14120F]/60">Read</p>
            <ul className="mt-3 space-y-1.5 text-[14px]">
              <li>
                <Link href="/house-issue/goods" className="hse-link">Goods</Link>
              </li>
              <li>
                <Link href="/house-issue/issues" className="hse-link">Every issue</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="hse-rule">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-baseline justify-between gap-4 px-5 py-5 sm:px-8">
            <p className="hse-label text-[#14120F]/45">
              A concept room by The Pass
            </p>
            <a href="/" className="hse-link text-[13px]">
              madisonfour.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
