"use client";

import { useRef, useState } from "react";
import { checkCardAction } from "@/lib/platform/giftcard-actions";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

/**
 * Take a payment off a gift card. Before anything is taken, it looks the
 * card up and asks with the balance that will be left.
 */
export function RedeemForm({ org, action, code, found }: {
  org: string;
  action: (form: FormData) => void | Promise<void>;
  code?: string;
  found?: { code: string; balanceCents: number; status: string } | null;
}) {
  const form = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      ref={form}
      action={action}
      className="pf-body"
      onSubmit={async (e) => {
        if (confirmed.current) { confirmed.current = false; return; }
        e.preventDefault();
        setErr(null);
        const data = new FormData(e.currentTarget);
        const amount = Math.round(Number(String(data.get("amount") ?? "").replace(/[$,]/g, "")) * 100);
        if (!Number.isFinite(amount) || amount <= 0) { setErr("Enter an amount."); return; }
        setChecking(true);
        const card = await checkCardAction(org, String(data.get("code") ?? "")).catch(() => null);
        setChecking(false);
        if (!card) { setErr("No card with that code."); return; }
        if (card.status !== "active") { setErr("That card isn't active (unpaid or void)."); return; }
        if (amount > card.balanceCents) { setErr(`Only ${money(card.balanceCents)} left on that card.`); return; }
        if (!window.confirm(`Take ${money(amount)} off ${card.code}? It will have ${money(card.balanceCents - amount)} left.`)) return;
        confirmed.current = true;
        form.current?.requestSubmit();
      }}
    >
      <input type="hidden" name="org" value={org} />
      <div className="pf-field"><label htmlFor="gc-code">Code</label><input id="gc-code" name="code" defaultValue={code ?? ""} placeholder="ABCD-EFGH-JKMN" className="mono" required /></div>
      {found && <p className="pf-sub" style={{ margin: 0 }}>{found.code}: <b className="mono" style={{ color: "var(--ink)" }}>{money(found.balanceCents)}</b> left · {found.status === "active" ? "active" : found.status === "pending" ? "unpaid" : "void"}</p>}
      <div className="pf-field"><label htmlFor="gc-amt">Amount $</label><input id="gc-amt" name="amount" inputMode="decimal" required aria-invalid={err ? true : undefined} /></div>
      {err && <p className="pf-msg err" role="alert" style={{ margin: 0 }}>{err}</p>}
      <button className="pf-btn primary" disabled={checking}>{checking ? "Checking the card…" : "Take it off the card"}</button>
    </form>
  );
}
