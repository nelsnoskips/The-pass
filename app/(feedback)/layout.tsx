import type { Metadata } from "next";
import Link from "next/link";
import { Anton, Roboto_Mono } from "next/font/google";
import { FEEDBACK } from "@/lib/feedback";
import { Receipt } from "@/components/feedback/Receipt";
import { PageCut, TopBar } from "@/components/feedback/Chrome";
import { SmoothScroll } from "@/components/feedback/SmoothScroll";
import { CursorWave } from "@/components/feedback/Waveform";
import {
  OrderProvider,
  PressureProvider,
  SoundProvider,
} from "@/components/feedback/state";
import "./feedback.css";

/* Heavy condensed gothic for the poster type, and a mono for every
   number, label and readout on the panel — this room is full of
   instruments, and instruments are labelled in mono. */
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});
const mono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FEEDBACK — Smash Burgers, Fries & Shakes",
  description:
    "A burger counter run like a venue: the menu is a set list, the sauces are a pedal board, and the monthly burger is released like a tape. Rivertown, USA.",
  robots: { index: false, follow: false },
};

export default function FeedbackLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${anton.variable} ${mono.variable}`}>
      <SoundProvider>
        <OrderProvider>
          <PressureProvider>
            <SmoothScroll />
            <CursorWave />
            <PageCut />

            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[90] focus:bg-[#E8E1D3] focus:px-4 focus:py-2 focus:text-[#14100e]"
            >
              Skip to content
            </a>

            <TopBar />
            <main id="main">{children}</main>

            <footer className="border-t border-[rgba(232,225,211,0.12)] bg-[#0b0908]">
              <div className="mx-auto max-w-[1400px] px-5 pt-14 sm:px-8">
                <div className="grid gap-8 pb-12 sm:grid-cols-3">
                  <div>
                    <p className="fbk-display text-[28px]">{FEEDBACK.name}</p>
                    <p className="fbk-label mt-2 text-[rgba(232,225,211,0.5)]">
                      {FEEDBACK.descriptor}
                    </p>
                  </div>
                  <div>
                    <p className="fbk-label text-[rgba(232,225,211,0.5)]">
                      Find the noise
                    </p>
                    <p className="fbk-mono mt-3 text-[13px] leading-relaxed">
                      {FEEDBACK.address}
                      <br />
                      {FEEDBACK.city}
                      <br />
                      {FEEDBACK.phone}
                    </p>
                  </div>
                  <div>
                    <p className="fbk-label text-[rgba(232,225,211,0.5)]">Read</p>
                    <ul className="mt-3 space-y-1.5 text-[14px]">
                      <li>
                        <Link href="/feedback/menu" className="fbk-link">
                          Full set list
                        </Link>
                      </li>
                      <li>
                        <Link href="/feedback/merch" className="fbk-link">
                          Merch table
                        </Link>
                      </li>
                      <li>
                        <Link href="/feedback/order" className="fbk-link">
                          Order pickup
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* The pass window: the ticket prints out of the counter. */}
                <Receipt />

                <div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-[rgba(232,225,211,0.12)] py-5">
                  <p className="fbk-label text-[rgba(232,225,211,0.4)]">
                    A concept room by The Pass
                  </p>
                  <Link href="/" className="fbk-link fbk-mono text-[12px]">
                    madisonfour.com
                  </Link>
                </div>
              </div>
            </footer>
          </PressureProvider>
        </OrderProvider>
      </SoundProvider>
    </div>
  );
}
