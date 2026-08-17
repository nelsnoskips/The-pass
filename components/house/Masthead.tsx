import Link from "next/link";
import { HOUSE, issueLabel } from "@/lib/house";
import { ChickenCount } from "./ChickenCount";

/**
 * Two bars and a masthead. The black utility bar carries navigation,
 * the live rotisserie count and the cart; the paper bar carries the
 * issue line and the two things a hungry person wants — order, and see
 * the menu. Personality starts only after both are in reach.
 */
export function Masthead({ issue, dated }: { issue: number; dated: string }) {
  return (
    <header>
      <div className="bg-[#16130F] text-[#F2EDE4]">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/house-issue" className="flex items-center gap-3">
            <span className="hse-display text-[19px]">House Issue</span>
            <span className="hse-label rounded-full border border-[#F2EDE4]/50 px-2.5 py-1 text-[10px]">
              {HOUSE.mark}
            </span>
          </Link>

          <nav aria-label="Primary" className="order-3 flex items-center gap-6 sm:order-none">
            <Link href="/house-issue#menu" className="hse-label transition-colors hover:text-[#E8552A]">Menu</Link>
            <Link href="/house-issue/order" className="hse-label transition-colors hover:text-[#E8552A]">Order</Link>
            <Link href="/house-issue#visit" className="hse-label transition-colors hover:text-[#E8552A]">Visit</Link>
            <Link href="/house-issue/goods" className="hse-label transition-colors hover:text-[#E8552A]">Goods</Link>
          </nav>

          <div className="flex items-center gap-4">
            <ChickenCount variant="pill" />
            <span className="hse-label hse-num inline-flex items-center gap-2 rounded-full border border-[#F2EDE4]/50 px-3 py-1.5">
              <span aria-hidden>◻</span> 0
            </span>
          </div>
        </div>
      </div>

      <div className="hse-paper border-b-4 border-[#16130F]">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <p className="hse-label hse-num">
              Issue {issueLabel(issue)} / {dated}
            </p>
            <p className="hse-label text-[#16130F]/70">{HOUSE.hoursLong}</p>
            <p className="hse-label text-[#16130F]/70">1806 Los Angeles, CA</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/house-issue/order" className="hse-btn hse-label">
              <span aria-hidden>▣</span> Order Pickup
            </Link>
            <a href="#menu" className="hse-btn hse-btn-ghost hse-label">
              <span aria-hidden>☰</span> View Menu
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
