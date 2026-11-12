"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { placeOrderAction, previewPromoAction } from "@/lib/ordering/actions";
import type { OrderField } from "@/lib/ordering";
import { availabilityCovers, describeAvailability, type MenuAvailability } from "@/lib/sites/content";
import { guard } from "./net";

export interface OrderMenuItem {
  id: string; name: string; description: string; priceCents: number; menu: string; section: string; tags: string[];
  /** When it's served; null = whenever the kitchen takes orders. */
  availability?: MenuAvailability[] | null;
}
export interface ReadyOption { value: string; day: string; label: string }

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const TIPS = [0, 0.1, 0.15, 0.2];

/** Is an item served at a "yyyy-mm-ddTHH:MM" ready time? */
function servedAt(item: OrderMenuItem, when: string): boolean {
  if (!when || !item.availability) return true;
  const [date, time] = when.split("T");
  return item.availability.some((a) => availabilityCovers(a, date, time));
}

function names(list: string[]): string {
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * The guest's side of ordering: pick dishes, a time, and who it's for.
 * Totals here are a preview; the server prices the order again from the
 * published menu, and that is what's charged. Everything the guest
 * entered is held here, so a failed submit never wipes it.
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [headcount, setHeadcount] = useState("");
  // Dishes the server said are gone, so they can't be added back.
  const [gone, setGone] = useState<string[]>([]);
  // "Baklava just sold out — removed." Shown until the guest moves on.
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<OrderField | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [pending, start] = useTransition();

  const refs = {
    name: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null),
    headcount: useRef<HTMLInputElement>(null), when: useRef<HTMLSelectElement>(null), promo: useRef<HTMLInputElement>(null),
    cart: useRef<HTMLElement>(null), tip: useRef<HTMLParagraphElement>(null),
  };
  const errorRef = useRef<HTMLParagraphElement>(null);

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
    const t = setTimeout(() => {
      guard(() => previewPromoAction(slug, kind, JSON.parse(cartKey), applied)).then((r) => { if (live && r.ok) setPromo(r.value); });
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [cartKey, kind, applied, slug, hasAutoPromos]);

  useEffect(() => {
    if (!attempt) return;
    const target = field ? refs[field].current : errorRef.current;
    target?.focus();
    // Only when a new failure arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const discount = cart.length && !promo.error && (applied || hasAutoPromos) ? Math.min(promo.discountCents, subtotal) : 0;
  const tax = Math.round(((subtotal - discount) * taxBps) / 10_000);
  const tip = kind === "pickup" ? Math.round(subtotal * tipShare) : 0;
  const total = subtotal - discount + tax + tip;
  const max = kind === "catering" ? 500 : 50;
  const clearError = () => { if (error) { setError(null); setField(undefined); } };
  const change = (id: string, d: number) => {
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(max, (q[id] ?? 0) + d)) }));
    clearError();
    setNotice(null);
  };
  const short = kind === "catering" && subtotal < cateringMinCents;
  const options = times[kind];
  const days = [...new Set(options.map((o) => o.day))];
  const whenLabel = (v: string) => {
    const o = options.find((x) => x.value === v);
    return o ? `${o.label} on ${o.day.split(",")[0]}` : "that time";
  };

  /** Take dishes out of the cart, keeping everything else. */
  const remove = (ids: string[]) => setQty((q) => Object.fromEntries(Object.entries(q).filter(([id]) => !ids.includes(id))));

  const pickTime = (v: string) => {
    setWhen(v);
    clearError();
    // A brunch dish can't be ready for Wednesday dinner.
    const off = cart.map((l) => byId.get(l.itemId)).filter((i): i is OrderMenuItem => Boolean(i) && !servedAt(i!, v));
    if (off.length) {
      remove(off.map((i) => i.id));
      setNotice(`${names(off.map((i) => i.name))} ${off.length > 1 ? "aren't" : "isn't"} served at ${whenLabel(v)} — removed. Everything else is still in your order.`);
    } else setNotice(null);
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    start(async () => {
      const r = await guard(() => placeOrderAction({ error: null }, form));
      if (!r.ok) { setError(r.error); setField(undefined); setAttempt((n) => n + 1); return; }
      const s = r.value;
      if (s.unavailable?.length) {
        const ids = s.unavailable;
        const known = ids.map((id) => byId.get(id)?.name).filter((n): n is string => Boolean(n));
        const offHours = /served at that time/.test(s.error ?? "");
        remove(ids);
        if (!offHours) setGone((g) => [...new Set([...g, ...ids])]);
        const what = known.length ? names(known) : "Something in your order";
        setNotice(offHours
          ? `${what} ${known.length > 1 ? "aren't" : "isn't"} served at ${whenLabel(when)} — removed. Everything else is still in your order.`
          : `${what} just sold out — removed. Everything else is still in your order; check it and place it again.`);
        setError(null);
        setField("cart");
        setAttempt((n) => n + 1);
        return;
      }
      setError(s.error);
      setField(s.field);
      if (s.error) setAttempt((n) => n + 1);
    });
  };

  const groups = new Map<string, OrderMenuItem[]>();
  for (const i of items) groups.set(`${i.menu} · ${i.section}`, [...(groups.get(`${i.menu} · ${i.section}`) ?? []), i]);
  const invalid = (f: OrderField) => (field === f && error ? { "aria-invalid": true, "aria-describedby": "o-error" } : {});

  return (
    <form onSubmit={submit} className="site-order">
      <input type="hidden" name="site" value={slug} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="cart" value={JSON.stringify(cart)} />
      <input type="hidden" name="tip" value={(tip / 100).toFixed(2)} />
      <input type="hidden" name="promo" value={applied} />
      <div className="site-hp" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

      <div className="site-order-menu">
        {kinds.length > 1 && (
          <div className="site-times" role="group" aria-label="Order type" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 0, marginBottom: 28 }}>
            <button type="button" className="site-time" aria-pressed={kind === "pickup"} onClick={() => { setKind("pickup"); setWhen(""); clearError(); }}>Pickup</button>
            <button type="button" className="site-time" aria-pressed={kind === "catering"} onClick={() => { setKind("catering"); setWhen(""); clearError(); }}>Catering</button>
          </div>
        )}
        {[...groups.entries()].map(([g, list]) => (
          <section key={g} className="site-order-group">
            <h2 className="site-legend">{g}</h2>
            {list.map((i) => {
              const soldOut = gone.includes(i.id);
              const offHours = !soldOut && !servedAt(i, when);
              const n = qty[i.id] ?? 0;
              return (
                <div key={i.id} className={`site-order-item${soldOut || offHours ? " off" : ""}`}>
                  <div>
                    <div className="name">{i.name}</div>
                    {i.description && <p>{i.description}</p>}
                    <span className="price">{money(i.priceCents)}</span>
                    {soldOut && <span className="site-tag">Sold out</span>}
                    {!soldOut && i.availability && (
                      <span className="site-tag">{offHours ? "Not served then · " : ""}{i.availability.map(describeAvailability).join("; ")}</span>
                    )}
                  </div>
                  <div className="site-qty" role="group" aria-label={`Quantity of ${i.name}`}>
                    {n > 0 && <button type="button" onClick={() => change(i.id, -1)} aria-label={`One less ${i.name}`}>−</button>}
                    {n > 0 && <output aria-live="polite">{n}</output>}
                    <button type="button" onClick={() => change(i.id, kind === "catering" && !n ? 10 : 1)} aria-label={`Add ${i.name}`}
                      disabled={soldOut || offHours}>+</button>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <aside id="cart" ref={refs.cart} tabIndex={-1} className="site-panel site-stack site-order-cart" aria-labelledby="cart-title">
        <p className="site-legend" id="cart-title">Your order</p>
        {notice && <p className="site-error" role="alert" style={{ margin: 0 }}>{notice}</p>}
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
            <input id="o-promo" ref={refs.promo} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); clearError(); }} autoComplete="off" maxLength={24}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setApplied(code.trim()); } }} {...invalid("promo")} />
            <button type="button" className="site-btn" onClick={() => setApplied(code.trim())} disabled={!code.trim() && !applied}>{applied && !code.trim() ? "Remove" : "Apply"}</button>
          </div>
          {applied && promo.error && <p className="site-error" role="alert" style={{ margin: 0 }}>{promo.error}</p>}
        </div>

        {kind === "pickup" && payOnline && (
          <div>
            <p className="site-legend" id="tip" ref={refs.tip} tabIndex={-1}>Tip for the team</p>
            <div className="site-times" role="group" aria-labelledby="tip" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {TIPS.map((t) => <button key={t} type="button" className="site-time" aria-pressed={tipShare === t} onClick={() => { setTipShare(t); clearError(); }}>{t ? `${t * 100}%` : "None"}</button>)}
            </div>
          </div>
        )}

        <div className="site-field">
          <label htmlFor="when">{kind === "pickup" ? "Pickup time" : "Ready at"}</label>
          {options.length === 0 ? <p className="site-note" style={{ margin: 0 }}>No times left {kind === "pickup" ? "today or tomorrow" : "in the next two weeks"}. Please call us.</p> : (
            <select id="when" ref={refs.when} name="when" required value={when} onChange={(e) => pickTime(e.target.value)} {...invalid("when")}>
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
          <div className="site-field"><label htmlFor="headcount">How many people</label>
            <input id="headcount" ref={refs.headcount} name="headcount" type="number" min={1} max={2000} inputMode="numeric" required
              value={headcount} onChange={(e) => { setHeadcount(e.target.value); clearError(); }} {...invalid("headcount")} /></div>
        )}
        <div className="site-field"><label htmlFor="o-name">Name</label>
          <input id="o-name" ref={refs.name} name="name" autoComplete="name" required value={name} onChange={(e) => { setName(e.target.value); clearError(); }} {...invalid("name")} /></div>
        <div className="site-field"><label htmlFor="o-phone">Mobile</label>
          <input id="o-phone" ref={refs.phone} name="phone" type="tel" autoComplete="tel" inputMode="tel" required value={phone} onChange={(e) => { setPhone(e.target.value); clearError(); }} {...invalid("phone")} /></div>
        <div className="site-field"><label htmlFor="o-email">Email {payOnline ? "(for your receipt)" : "(optional)"}</label>
          <input id="o-email" ref={refs.email} name="email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }} {...invalid("email")} /></div>
        <div className="site-field"><label htmlFor="o-notes">Notes for the kitchen (optional)</label>
          <textarea id="o-notes" name="notes" maxLength={500} placeholder={kind === "catering" ? "Delivery address, setup, allergies…" : "Allergies, no onions…"}
            value={notes} onChange={(e) => { setNotes(e.target.value); clearError(); }} /></div>
        {error && <p id="o-error" ref={errorRef} tabIndex={-1} className="site-error" role="alert">{error}</p>}
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
