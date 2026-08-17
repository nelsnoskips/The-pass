import { Masthead } from "@/components/house/Masthead";
import { OrderFlow } from "@/components/house/OrderFlow";
import { FULFILMENT, HOUSE, currentIssue } from "@/lib/house";

export const metadata = { title: "Order — HOUSE ISSUE" };

/**
 * The register. Same rules as the counter: what is on, what has run
 * out, how long it takes, and where to come.
 */
export default function OrderPage() {
  const issue = currentIssue();

  return (
    <>
      <Masthead issue={issue.number} dated={issue.dated} />

      <main id="main" className="hse-paper">
        <section className="border-b-4 border-[#16130F]">
          <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
            <p className="hse-label text-[#E8552A]">Order</p>
            <h1 className="hse-display mt-4 text-[clamp(40px,8vw,104px)] leading-[0.86]">
              Order ahead.
            </h1>
            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-2">
              <p className="hse-label text-[#16130F]/70">
                Pickup · {FULFILMENT.pickupWait}
              </p>
              <p className="hse-label text-[#16130F]/70">
                Delivery · {FULFILMENT.radius}, ${FULFILMENT.fee}
              </p>
              <p className="hse-label text-[#16130F]/70">{HOUSE.kitchenNote}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6">
          <OrderFlow />
        </section>
      </main>
    </>
  );
}
