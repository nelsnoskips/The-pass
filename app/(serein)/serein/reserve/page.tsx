import Image from "next/image";
import Link from "next/link";
import { ReserveFlow } from "@/components/serein/ReserveFlow";

export const metadata = { title: "Reserve — SEREIN" };

const NIGHT = "/images/serein/serein-night.jpg";

/**
 * The reservation room: the booking flow as designed experience rather
 * than an embedded vendor widget. Quiet header, the flow, and a way
 * back into the evening.
 */
export default function ReservePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#05070B]">
        <div className="absolute inset-0" aria-hidden>
          <Image src={NIGHT} alt="" fill priority quality={86} sizes="100vw" className="object-cover object-[72%_center]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#05070B]/92 via-[#05070B]/85 to-[#05070B]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-5 pb-14 pt-32 sm:px-8 sm:pt-36">
          <Link
            href="/serein"
            className="srn-label text-[#E9E5DB]/50 transition-colors hover:text-[#E9E5DB]"
          >
            ← SEREIN
          </Link>
          <h1 className="srn-serif mt-8 text-[clamp(34px,5vw,60px)] leading-[1.04] text-[#E9E5DB]">
            Hold an evening
            <br />
            <em className="italic text-[#C9884B]">at the edge.</em>
          </h1>
          <p className="mt-6 max-w-[460px] text-[15px] leading-relaxed text-[#E9E5DB]/70">
            One seating each night, thirty seats, ten movements. Choose the
            evening and we will hold the table until the light goes.
          </p>
        </div>
      </section>

      <section className="bg-[#05070B] px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-[1200px]">
          <ReserveFlow />
        </div>
      </section>

      <footer className="border-t border-[#E9E5DB]/12 bg-[#05070B] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-baseline justify-between gap-x-10 gap-y-4">
          <p className="srn-label text-[#E9E5DB]">SEREIN</p>
          <p className="srn-label text-[#E9E5DB]/45">Santa Barbara, California</p>
          <p className="text-[12.5px] text-[#E9E5DB]/55">
            A concept room by{" "}
            <a href="/" className="border-b border-[#C9884B]/40 text-[#C9884B] transition-colors hover:border-[#C9884B]">
              The Pass
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
