import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orderByToken } from "@/lib/ordering";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

const STEPS = [
  { key: "placed", label: "Received" },
  { key: "accepted", label: "Being made" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Picked up" },
] as const;

/** The guest's receipt and live status. */
export default async function OrderStatus({ params, searchParams }: { params: Promise<{ site: string; token: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { site, token } = await params;
  const { paid } = await searchParams;
  const sql = db();
  const o = sql ? await orderByToken(sql, token) : null;
  if (!o || (o.slug && o.slug !== site)) notFound();
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;
  const when = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: o.timezone }).format(o.readyAt);
  const step = STEPS.findIndex((s) => s.key === o.status);
  const open = !["completed", "cancelled"].includes(o.status);

  return (
    <div className="site-wrap site-book">
      {/* Refresh while the order is open, so "Ready" shows up without a tap. */}
      {open && <meta httpEquiv="refresh" content="30" />}
      <div className="head">
        <p className="site-eyebrow">Order {o.number}</p>
        <h1>
          {o.status === "awaiting_payment" ? (paid ? "Confirming your payment…" : "Waiting for payment.")
            : o.status === "cancelled" ? "This order was cancelled."
            : o.status === "ready" ? "It's ready." : o.status === "completed" ? "Enjoy." : "We've got your order."}
        </h1>
        <p style={{ marginTop: 18 }}>{o.kind === "pickup" ? "Pickup" : "Ready"} {when}{o.kind === "catering" && o.headcount ? ` · for ${o.headcount}` : ""}.</p>
      </div>
      <div className="site-panel site-stack">
        {o.status !== "cancelled" && o.status !== "awaiting_payment" && (
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {STEPS.map((s, i) => (
              <li key={s.key} className={`site-status ${i <= step ? "ok" : "off"}`} style={{ textAlign: "center" }}>{s.label}</li>
            ))}
          </ol>
        )}
        <dl className="site-summary" style={{ margin: 0 }}>
          {o.items.map((l, i) => <div key={i}><dt>{l.qty} × {l.name}{l.note ? ` — ${l.note}` : ""}</dt><dd>{money(l.lineCents)}</dd></div>)}
          <div><dt>Subtotal</dt><dd>{money(o.subtotalCents)}</dd></div>
          {o.taxCents > 0 && <div><dt>Tax</dt><dd>{money(o.taxCents)}</dd></div>}
          {o.tipCents > 0 && <div><dt>Tip</dt><dd>{money(o.tipCents)}</dd></div>}
          <div><dt>Total</dt><dd>{money(o.totalCents)} · {o.payment === "paid" ? "paid" : o.payment === "refunded" ? "refunded" : o.payment === "at_pickup" ? "pay at pickup" : "unpaid"}</dd></div>
        </dl>
        {o.notes && <p className="site-note" style={{ margin: 0 }}>Your note: {o.notes}</p>}
        <p className="site-note" style={{ margin: 0 }}>Questions? Call the restaurant and mention order {o.number}.</p>
        <Link href={`/s/${site}`} className="site-note">Back to the restaurant</Link>
      </div>
    </div>
  );
}
