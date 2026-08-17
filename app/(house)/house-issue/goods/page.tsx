import { Masthead } from "@/components/house/Masthead";
import { allGoods, currentIssue, issueLabel } from "@/lib/house";

export const metadata = { title: "Goods — HOUSE ISSUE" };

/**
 * Goods: the second revenue line, published on the same terms as the
 * food. Everything carries the issue it came from, which is what makes
 * a tote feel like a release rather than merchandise.
 */
export default function GoodsPage() {
  const issue = currentIssue();
  const goods = allGoods();

  return (
    <>
      <Masthead issue={issue.number} dated={issue.dated} />

      <main id="main" className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <div>
            <p className="hse-label text-[#B3352A]">Goods</p>
            <h2 className="hse-display mt-5 text-[clamp(34px,5.5vw,68px)]">
              Things we make that
              <br />
              keep longer than lunch.
            </h2>
            <p className="mt-6 max-w-[560px] text-[15px] leading-relaxed text-[#14120F]/75">
              Sauces we jar because people kept asking, coffee roasted for
              us up the road, and a bag heavy enough to carry a whole
              chicken home. Each one belongs to the issue it appeared in.
              When a run is gone, it is gone until we publish it again.
            </p>
          </div>
          <figure>
            <div className="hse-plate hse-plate-empty aspect-[4/3]">
              <p className="hse-label px-6 text-center text-[#14120F]/40">
                Plate 02
                <br />
                The shelf
              </p>
            </div>
            <figcaption className="hse-label mt-3 text-[#14120F]/50">
              Plate 02 · The goods shelf, by the register
            </figcaption>
          </figure>
        </div>

        <ul className="mt-16 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {goods.map((g) => (
            <li key={`${g.issue}-${g.name}`}>
              <div className="hse-plate hse-plate-empty aspect-[4/5]">
                <p className="hse-label px-4 text-center text-[#14120F]/35">
                  {g.name}
                </p>
              </div>
              <p className="hse-label mt-4 text-[#14120F]/50">
                Issue {issueLabel(g.issue)}
              </p>
              <h3 className="hse-display mt-2 text-[24px]">{g.name}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#14120F]/70">
                {g.detail}
              </p>
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#14120F]/15 pt-4">
                <span className="hse-num text-[17px]">${g.price}</span>
                {g.status === "sold out" ? (
                  <span className="hse-label text-[#14120F]/40">Sold out</span>
                ) : (
                  <button
                    type="button"
                    className="hse-label border border-[#14120F] px-4 py-2.5 transition-colors hover:bg-[#14120F] hover:text-[#F4F1EA]"
                  >
                    Add · {g.status === "low" ? "Low stock" : "In stock"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <p className="hse-rule mt-16 pt-6 text-[13px] leading-relaxed text-[#14120F]/55">
          A concept room by The Pass, so the cart is for demonstration.
          Goods are sold at the counter and, when a run is large enough,
          shipped within California.
        </p>
      </main>
    </>
  );
}
