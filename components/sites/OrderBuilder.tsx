"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { placeOrderAction, previewPromoAction } from "@/lib/ordering/actions";

export interface OrderMenuItem { id: string; name: string; description: string; priceCents: number; menu: string; section: string; tags: string[] }
export interface ReadyOption { value: string; day: string; label: string }

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const TIPS = [0, 0.1, 0.15, 0.2];

/**
 * The guest's side of ordering: pick dishes, a time, and who it's for.
 * Totals here are a preview; the server prices the order again from the
 * published menu, and that is what's charged.
 */
export function OrderBuilder({
  slug, items, kinds, times, taxBps, cateringMinCents, payOnline, hasAutoPromos = false,
}: {
  slug: string;
  items: OrderMenuItem[];
  kinds: ("pickup" | "catering")[];
  times: Record<"pickup" | "catering", ReadyOption[]>;
  taxBps: number;
  cateringMinCents: number;
  payOnline: boolean;
  /** An automatic promotion is running: preview it as the cart changes. */
  hasAutoPromos?: boolean;
}) {
  const [kind, setKind] = useState<"pickup" | "catering">(kinds[0]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [tipShare, setTipShare] = useState(0);
  const [when, setWhen] = useState("");
  const [state, submit, pending] = useActionState(placeOrderAction, { error: null });

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const cart = Object.entries(qty).filter(([, n]) => n > 0).map(([itemId, n]) => ({ itemId, qty: n }));
  const subtotal = cart.reduce((s, l) => s + (byId.get(l.itemId)?.priceCents ?? 0) * l.qty, 0);
  // Promo: the typed code, the applied one, and the server's preview.
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState("");
  const [promo, setPromo] = useState<{ discountCents: number; label: string | null; error: string | null }>({ discountCents: 0, label: null, error: null });
  const cartKey = JSON.stringify(cart);
  useEffect(() => {
    if (cartKey === "[]" || (!applied && !hasAutoPromos)) return;
    let live = true;
    const t = setTimeout(() => { previewPromoAction(slug, kind, JSON.parse(cartKey), applied).then((r) => { if (live) setPromo(r); }); }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [cartKey, kind, applied, slug, hasAutoPromos]);
  const discount = cart.length && !promo.error && (applied || hasAutoPromos) ? Math.min(promo.discountCents, subtotal) : 0;
  const tax = Math.round(((subtotal - discount) * taxBps) / 10_000);
  const tip = kind === "pickup" ? Math.round(subtotal * tipShare) : 0;
  const total = subtotal - discount + tax + tip;
  const max = kind === "catering" ? 500 : 50;
  const change = (id: string, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(max, (q[id] ?? 0) + d)) }));
  const short = kind === "catering" && subtotal < cateringMinCents;
  const options = times[kind];
  const days = [...new Set(options.map((o) => o.day))];

  const groups = new Map<string, OrderMenuItem[]>();
  for (const i of items) groups.set(`${i.menu} · ${i.section}`, [...(groups.get(`${i.menu} · ${i.section}`) ?? []), i]);

  return (
    <form action={submit} className="site-order">
      <input type="hidden" name="site" value={slug} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="cart" value={JSON.stringify(cart)} />
      <input type="hidden" name="tip" value={(tip / 100).toFixed(2)} />
      <input type="hidden" name="promo" value={applied} />
      <div className="site-hp" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

      <div className="site-order-menu">
        {kinds.length > 1 && (
          <div className="site-times" role="group" aria-label="Order type" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 0, marginBottom: 28 }}>
            <button type="button" className="site-time" aria-pressed={kind === "pickup"} onClick={() => { setKind("pickup"); setWhen(""); }}>Pickup</button>
            <button type="button" className="site-time" aria-pressed={kind === "catering"} onClick={() => { setKind("catering"); setWhen(""); }}>Catering</button>
          </div>
        )}
        {[...groups.entries()].map(([g, list]) => (
          <section key={g} className="site-order-group">
            <h2 className="site-legend">{g}</h2>
            {list.map((i) => (
              <div key={i.id} className="site-order-item">
                <div>
                  <div className="name">{i.name}</div>
                  {i.description && <p>{i.description}</p>}
                  <span className="price">{money(i.priceCents)}</span>
                </div>
                <div className="site-qty" aria-label={`Quantity of ${i.name}`}>
                  {(qty[i.id] ?? 0) > 0 && <button type="button" onClick={() => change(i.id, -1)} aria-label={`One less ${i.name}`}>−</button>}
                  {(qty[i.id] ?? 0) > 0 && <output aria-live="polite">{qty[i.id]}</output>}
                  <button type="button" onClick={() => change(i.id, kind === "catering" && !qty[i.id] ? 10 : 1)} aria-label={`Add ${i.name}`}>+</button>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>

      <aside id="cart" className="site-panel site-stack site-order-cart">
        <p className="site-legend">Your order</p>
        {cart.length === 0 ? <p className="site-note" style={{ margin: 0 }}>Add something from the menu.</p> : (
          <dl className="site-summary" style={{ margin: 0 }}>
            {cart.map((l) => <div key={l.itemId}><dt>{l.qty} × {byId.get(l.itemId)?.name}</dt><dd>{money((byId.get(l.itemId)?.priceCents ?? 0) * l.qty)}</dd></div>)}
            <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            {discount > 0 && <div><dt>Discount{promo.label ? ` (${promo.label})` : ""}</dt><dd>−{money(discount)}</dd></div>}
            {taxBps > 0 && <div><dt>Tax</dt><dd>{money(tax)}</dd></div>}
            {tip > 0 && <div><dt>Tip</dt><dd>{money(tip)}</dd></div>}
            <div><dt style={{ color: "var(--ink)", fontWeight: 600 }}>Total</dt><dd>{money(total)}</dd></div>
          </dl>
        )}
        {short && <p className="site-note" style={{ margin: 0 }}>Catering orders start at {money(cateringMinCents)}.</p>}

        <div className="site-field">
          <label htmlFor="o-promo">Promo code (optional)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="o-promo" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" maxLength={24}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setApplied(code.trim()); } }} />
            <button type="button" className="site-btn" onClick={() => setApplied(code.trim())} disabled={!code.trim() && !applied}>{applied && !code.trim() ? "Remove" : "Apply"}</button>
          </div>
          {applied && promo.error && <p className="site-error" role="alert" style={{ margin: 0 }}>{promo.error}</p>}
        </div>

        {kind === "pickup" && payOnline && (
          <div>
            <p className="site-legend" id="tip">Tip for the team</p>
            <div className="site-times" role="group" aria-labelledby="tip" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {TIPS.map((t) => <button key={t} type="button" className="site-time" aria-pressed={tipShare === t} onClick={() => setTipShare(t)}>{t ? `${t * 100}%` : "None"}</button>)}
            </div>
          </div>
        )}

        <div className="site-field">
          <label htmlFor="when">{kind === "pickup" ? "Pickup time" : "Ready at"}</label>
          {options.length === 0 ? <p className="site-note" style={{ margin: 0 }}>No times left {kind === "pickup" ? "today or tomorrow" : "in the next two weeks"}. Please call us.</p> : (
            <select id="when" name="when" required value={when} onChange={(e) => setWhen(e.target.value)}>
              <option value="" disabled>Choose a time</option>
              {days.map((d) => (
                <optgroup key={d} label={d}>
                  {options.filter((o) => o.day === d).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          )}
        </div>
        {kind === "catering" && (
          <div className="site-field"><label htmlFor="headcount">How many people</label><input id="headcount" name="headcount" type="number" min={1} max={2000} inputMode="numeric" required /></div>
        )}
        <div className="site-field"><label htmlFor="o-name">Name</label><input id="o-name" name="name" autoComplete="name" required /></div>
        <div className="site-field"><label htmlFor="o-phone">Mobile</label><input id="o-phone" name="phone" type="tel" autoComplete="tel" required /></div>
        <div className="site-field"><label htmlFor="o-email">Email {payOnline ? "(for your receipt)" : "(optional)"}</label><input id="o-email" name="email" type="email" autoComplete="email" /></div>
        <div className="site-field"><label htmlFor="o-notes">Notes for the kitchen (optional)</label><textarea id="o-notes" name="notes" maxLength={500} placeholder={kind === "catering" ? "Delivery address, setup, allergies…" : "Allergies, no onions…"} /></div>
        {state.error && <p className="site-error" role="alert">{state.error}</p>}
        <button className="site-btn large" disabled={pending || cart.length === 0 || short || !when}>
          {pending ? "One moment…" : payOnline ? `Pay ${money(total)}` : `Place order · ${money(total)}`}
        </button>
        <p className="site-note" style={{ margin: 0 }}>
          {payOnline ? "You'll pay securely on Stripe. " : "Pay when you pick up. "}We&rsquo;ll text you{kind === "pickup" ? " when it's ready" : " if anything changes"}. Ordered straight from the restaurant — no delivery-app fees.
        </p>
      </aside>
      {cart.length > 0 && (
        <a href="#cart" className="site-order-bar">
          <span>{cart.reduce((n, l) => n + l.qty, 0)} item{cart.reduce((n, l) => n + l.qty, 0) === 1 ? "" : "s"}</span>
          <b>Review order · {money(total)}</b>
        </a>
      )}
    </form>
  );
}
