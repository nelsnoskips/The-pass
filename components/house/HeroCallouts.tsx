/**
 * Ingredient callouts drawn onto the intact sandwich. Each one waits its
 * turn as you scroll: the dot lands, the leader line draws outward, the
 * label arrives. It annotates the photograph the way the feature spread
 * annotates the rotisserie plate, which keeps the hero in the same
 * editorial voice as the rest of the issue.
 *
 * The markers live inside the sandwich's parallax layer, so they travel
 * with it and stay anchored. Decorative, so hidden from assistive tech:
 * the ingredients are already listed in the menu below.
 */

type Callout = {
  /** Anchor, as a percentage of the sandwich frame. */
  top: string;
  left: string;
  side: "left" | "right";
  label: string;
  detail: string;
};

const CALLOUTS: Callout[] = [
  { top: "13%", left: "78%", side: "right", label: "Sesame sourdough", detail: "Baked two blocks away" },
  { top: "33%", left: "22%", side: "left", label: "Dill pickle", detail: "House brined, garlic, chili" },
  { top: "50%", left: "80%", side: "right", label: "Bacon, aioli", detail: "Rendered each morning" },
  { top: "68%", left: "26%", side: "left", label: "Turkey", detail: "Roasted whole, sliced to order" },
];

export function HeroCallouts() {
  return (
    <div className="hse-cals" aria-hidden>
      {CALLOUTS.map((c, i) => (
        <span
          key={c.label}
          className={`hse-cal hse-cal-${c.side} hse-cal-${i}`}
          style={{ top: c.top, left: c.left }}
        >
          <span className="hse-cal-dot" />
          <span className="hse-cal-line" />
          <span className="hse-cal-text">
            {c.label}
            <span className="hse-cal-detail">{c.detail}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
