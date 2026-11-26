"use client";

import { useMemo, useState } from "react";
import { BRAND, CATEGORY_TREE, FULFILLMENT, PRODUCTS, productImage } from "@/lib/catalog";
import { asset } from "@/lib/images";
import { ORRAVAN } from "@/lib/site";

/**
 * The parts catalog. Filter by category or search a part number, add
 * parts to a list with quantities, then send the list as a quote
 * request — the "parts-request" Netlify form. Their old store had an
 * "Add to cart" with no prices; this is the same idea said plainly.
 */
export function Inventory() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [child, setChild] = useState<string | null>(null);
  const [list, setList] = useState<Record<string, number>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (child && !p.categories.includes(child)) return false;
      if (group && !p.categories.includes(group)) return false;
      if (q && !(p.sku.toLowerCase().includes(q) || p.overview.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query, group, child]);

  const chosen = Object.entries(list).filter(([, n]) => n > 0);
  const count = chosen.reduce((a, [, n]) => a + n, 0);
  const setQty = (sku: string, n: number) => setList((l) => ({ ...l, [sku]: Math.max(0, Math.min(999, n)) }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chosen.length) return;
    const form = e.currentTarget;
    setState("sending");
    const data = new FormData(form);
    data.set("parts", chosen.map(([sku, n]) => `${sku} × ${n}`).join("\n"));
    data.set("page", window.location.href);
    try {
      const res = await fetch(asset("/__forms.html"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data as unknown as Record<string, string>).toString(),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setList({});
      setState("sent");
    } catch {
      setState("failed");
    }
  };

  const active = CATEGORY_TREE.find((g) => g.name === group);

  return (
    <div className="o-inv">
      <div className="o-inv-main">
        <div className="o-inv-tools">
          <label className="o-inv-search">
            <span className="sr-only">Search part numbers</span>
            <input
              type="search"
              placeholder="Search a part number, e.g. FX-PCX"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="o-inv-chips" role="group" aria-label="Category">
            <button type="button" aria-pressed={!group} onClick={() => { setGroup(null); setChild(null); }}>
              All parts
            </button>
            {CATEGORY_TREE.map((g) => (
              <button key={g.name} type="button" aria-pressed={group === g.name} onClick={() => { setGroup(g.name); setChild(null); }}>
                {g.name}
              </button>
            ))}
          </div>
          {active && active.children.length > 1 && (
            <div className="o-inv-chips o-inv-sub" role="group" aria-label={`${active.name} type`}>
              <button type="button" aria-pressed={!child} onClick={() => setChild(null)}>All {active.name.toLowerCase()}</button>
              {active.children.map((c) => (
                <button key={c} type="button" aria-pressed={child === c} onClick={() => setChild(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <p className="text-[12px] text-ink-mute">
            {shown.length} of {PRODUCTS.length} parts · {BRAND} · {FULFILLMENT}
          </p>
        </div>

        <ul className="o-inv-grid">
          {shown.map((p) => {
            const n = list[p.sku] ?? 0;
            return (
              <li key={p.sku} id={p.sku} className="o-inv-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(productImage(p.sku))} alt={`${BRAND} ${p.sku}`} loading="lazy" decoding="async" />
                <div className="o-inv-body">
                  <p className="o-label text-[10px] text-ink-mute">{BRAND}</p>
                  <p className="o-inv-sku">{p.sku}</p>
                  {p.overview && <p className="o-inv-overview">{p.overview}</p>}
                  <p className="o-inv-tags">{[...p.categories.filter((c) => !CATEGORY_TREE.some((g) => g.name === c)), ...p.tags].join(" · ")}</p>
                  {n === 0 ? (
                    <button type="button" className="o-inv-add" onClick={() => setQty(p.sku, 1)}>
                      Add to parts list
                    </button>
                  ) : (
                    <div className="o-inv-qty" aria-label={`Quantity of ${p.sku}`}>
                      <button type="button" onClick={() => setQty(p.sku, n - 1)} aria-label="Fewer">−</button>
                      <input
                        inputMode="numeric"
                        value={n}
                        onChange={(e) => setQty(p.sku, Number(e.target.value.replace(/\D/g, "")) || 0)}
                        aria-label={`Quantity of ${p.sku}`}
                      />
                      <button type="button" onClick={() => setQty(p.sku, n + 1)} aria-label="More">+</button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {!shown.length && (
            <li className="o-inv-empty">
              No parts match that. Not listed? Ask us: <a href={`tel:${ORRAVAN.phone.replace(/\D/g, "")}`}>{ORRAVAN.phone}</a>
            </li>
          )}
        </ul>
      </div>

      <aside className="o-inv-list" aria-label="Parts list">
        <p className="o-display text-[1.6rem] leading-none">Parts list</p>
        {state === "sent" ? (
          <p className="mt-4 text-[14px] text-ink-soft" role="status">
            Thanks. Your parts request is with our team, and we&apos;ll be in touch with pricing and availability.
          </p>
        ) : (
          <>
            {chosen.length ? (
              <ul className="o-inv-chosen">
                {chosen.map(([sku, n]) => (
                  <li key={sku}>
                    <span>{sku}</span>
                    <span>× {n}</span>
                    <button type="button" onClick={() => setQty(sku, 0)} aria-label={`Remove ${sku}`}>&times;</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-ink-mute">Add parts to request pricing and availability.</p>
            )}
            <form className="o-inv-form" onSubmit={submit} name="parts-request">
              <input type="hidden" name="form-name" value="parts-request" />
              <p hidden>
                <label>Leave this empty <input name="bot-field" tabIndex={-1} autoComplete="off" /></label>
              </p>
              <input name="name" required placeholder="Name *" autoComplete="name" aria-label="Name" />
              <input name="company" placeholder="Company" autoComplete="organization" aria-label="Company" />
              <input name="email" type="email" required placeholder="Email *" autoComplete="email" aria-label="Email" />
              <input name="phone" type="tel" required placeholder="Phone *" autoComplete="tel" aria-label="Phone" />
              <textarea name="notes" rows={3} placeholder="Site address or notes" aria-label="Site address or notes" />
              {state === "failed" && (
                <p className="o-quote-error" role="alert">
                  Sorry, that didn&apos;t go through. Please call us at {ORRAVAN.phone} or email {ORRAVAN.email}.
                </p>
              )}
              <button type="submit" className="o-btn bg-[var(--orravan-blue)]" disabled={!chosen.length || state === "sending"}>
                {state === "sending" ? "Sending…" : count ? `Request quote for ${count} part${count === 1 ? "" : "s"}` : "Request quote"}
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
