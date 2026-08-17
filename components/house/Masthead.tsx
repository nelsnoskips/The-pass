import Link from "next/link";
import { HOUSE, issueLabel } from "@/lib/house";

/**
 * The masthead carries the live issue number and date the way a paper
 * does, and directly beneath it the four things a hungry person came
 * for: hours, address, phone, and how to order. The conceit never
 * stands in front of the operational layer.
 */
export function Masthead({ issue, dated }: { issue: number; dated: string }) {
  return (
    <header>
      <div className="hse-masthead">
        <div className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
            <p className="hse-label hse-num text-[#14120F]/70">
              Issue {issueLabel(issue)}
            </p>
            <p className="hse-label text-[#14120F]/70">{dated}</p>
            <p className="hse-label text-[#B3352A]">{HOUSE.hours}</p>
          </div>
          <Link href="/house-issue" className="mt-5 block">
            <h1 className="hse-display text-[clamp(44px,11vw,148px)] leading-[0.86] tracking-[-0.02em]">
              HOUSE ISSUE
            </h1>
          </Link>
          <p className="hse-label mt-5 text-[#14120F]/70">
            {HOUSE.descriptor} · {HOUSE.place}
          </p>
        </div>
      </div>

      {/* The operational bar: everything a guest needs before personality. */}
      <div className="border-b border-[#14120F]/20 bg-[#14120F] text-[#F4F1EA]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-3.5 sm:px-8">
          <p className="hse-label">{HOUSE.address}</p>
          <a href={`tel:${HOUSE.phone.replace(/[^0-9]/g, "")}`} className="hse-label hse-num transition-colors hover:text-[#E0A99F]">
            {HOUSE.phone}
          </a>
          <nav aria-label="Primary" className="flex items-center gap-6">
            <Link href="/house-issue#menu" className="hse-label transition-colors hover:text-[#E0A99F]">
              Menu
            </Link>
            <Link href="/house-issue/goods" className="hse-label transition-colors hover:text-[#E0A99F]">
              Goods
            </Link>
            <Link href="/house-issue/issues" className="hse-label transition-colors hover:text-[#E0A99F]">
              Archive
            </Link>
          </nav>
          <a
            href="#order"
            className="hse-label bg-[#B3352A] px-4 py-2 text-[#F4F1EA] transition-colors hover:bg-[#F4F1EA] hover:text-[#14120F]"
          >
            Order Pickup
          </a>
        </div>
      </div>
    </header>
  );
}
