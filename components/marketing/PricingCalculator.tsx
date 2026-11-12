"use client";

import { useId, useState } from "react";
import { ADDITIONAL_LOCATION_DISCOUNT_PCT, dollars, PLANS, planPriceCents, type PlanId } from "@/lib/billing/plans";

/** A monthly cost calculator: plan, locations, founding price or not. Same math as the invoice. */
export function PricingCalculator() {
  const id = useId();
  const [plan, setPlan] = useState<Exclude<PlanId, "group">>("the_pass");
  const [locations, setLocations] = useState(1);
  const [founding, setFounding] = useState(true);
  const n = Math.min(100, Math.max(1, Math.floor(locations) || 1));
  const p = PLANS[plan];
  const price = planPriceCents(plan, n, founding);
  const unit = founding ? p.foundingCents : p.listCents;
  const group = plan === "the_pass" && n >= PLANS.group.minLocations;

  return (
    <div className="hm-calc">
      <div className="hm-calc-in">
        <fieldset className="hm-calc-plans">
          <legend>Plan</legend>
          {(["host", "the_pass"] as const).map((x) => (
            <label key={x} className={plan === x ? "on" : ""}>
              <input type="radio" name={`${id}-plan`} value={x} checked={plan === x} onChange={() => setPlan(x)} />
              <span>{PLANS[x].name}</span>
            </label>
          ))}
        </fieldset>
        <div className="hm-calc-field">
          <label htmlFor={`${id}-loc`}>Locations</label>
          <div className="hm-calc-step">
            <button type="button" onClick={() => setLocations(Math.max(1, n - 1))} aria-label="One fewer location">−</button>
            <input id={`${id}-loc`} type="number" inputMode="numeric" min={1} max={100} value={n} onChange={(e) => setLocations(Number(e.target.value))} />
            <button type="button" onClick={() => setLocations(Math.min(100, n + 1))} aria-label="One more location">+</button>
          </div>
        </div>
        <label className="hm-calc-check">
          <input type="checkbox" checked={founding} onChange={(e) => setFounding(e.target.checked)} />
          <span>Founding price (first 50 restaurants)</span>
        </label>
      </div>
      <div className="hm-calc-out" aria-live="polite">
        <p className="hm-calc-total"><b className="mono">{dollars(price.netCents)}</b><span>a month{group ? " · Group" : ""}</span></p>
        <ul>
          <li><span>{p.name} × {n} location{n === 1 ? "" : "s"} at {dollars(unit)}</span><span className="mono">{dollars(price.grossCents)}</span></li>
          {n > 1 && <li><span>{ADDITIONAL_LOCATION_DISCOUNT_PCT}% off the other {n - 1}</span><span className="mono">−{dollars(price.discountCents)}</span></li>}
          <li><span>Texts included</span><span className="mono">{(p.textsIncluded * n).toLocaleString("en-US")}</span></li>
          <li><span>Per-cover, per-order and guest fees</span><span>None</span></li>
        </ul>
        <p className="hm-calc-note">
          Card processing is Stripe&rsquo;s own rate, passed through. Texts beyond the allowance are billed at cost. Month to month.
          {group && " Five or more locations is our Group plan: the same price and everything in The Pass."}
        </p>
      </div>
    </div>
  );
}
