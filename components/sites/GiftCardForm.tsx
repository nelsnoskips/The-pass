"use client";

import { useActionState, useState } from "react";
import { buyGiftCard } from "@/lib/giftcards/actions";

const AMOUNTS = [25, 50, 100, 150];

export function GiftCardForm({ slug }: { slug: string }) {
  const [amount, setAmount] = useState<string>("50");
  const [gift, setGift] = useState(true);
  const [state, submit, pending] = useActionState(buyGiftCard, { error: null });
  return (
    <form action={submit} className="site-panel site-stack">
      <input type="hidden" name="site" value={slug} />
      <div className="site-hp" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div>
        <p className="site-legend" id="gc-amount">Amount</p>
        <div className="site-times" role="group" aria-labelledby="gc-amount">
          {AMOUNTS.map((a) => (
            <button key={a} type="button" className="site-time" aria-pressed={amount === String(a)} onClick={() => setAmount(String(a))}>${a}</button>
          ))}
          <button type="button" className="site-time" aria-pressed={amount === "custom"} onClick={() => setAmount("custom")}>Other</button>
        </div>
        <input type="hidden" name="amount" value={amount} />
        {amount === "custom" && (
          <div className="site-field" style={{ marginTop: 10 }}>
            <label htmlFor="gc-custom">Amount in dollars ($10–$500)</label>
            <input id="gc-custom" name="custom" type="number" min={10} max={500} step={1} inputMode="numeric" required />
          </div>
        )}
      </div>
      <label className="site-check"><input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} /><span>Send it to someone as a gift</span></label>
      {gift && (
        <>
          <div className="site-row">
            <div className="site-field"><label htmlFor="gc-to">Their name</label><input id="gc-to" name="toName" required /></div>
            <div className="site-field"><label htmlFor="gc-toe">Their email</label><input id="gc-toe" name="toEmail" type="email" required /></div>
          </div>
          <div className="site-field"><label htmlFor="gc-msg">A note (optional)</label><textarea id="gc-msg" name="message" maxLength={500} /></div>
        </>
      )}
      <div className="site-row">
        <div className="site-field"><label htmlFor="gc-name">Your name</label><input id="gc-name" name="name" autoComplete="name" required /></div>
        <div className="site-field"><label htmlFor="gc-email">Your email</label><input id="gc-email" name="email" type="email" autoComplete="email" required /></div>
      </div>
      {state.error && <p className="site-error" role="alert">{state.error}</p>}
      <button className="site-btn large" disabled={pending}>{pending ? "One moment…" : "Continue to payment"}</button>
      <p className="site-note">You&rsquo;ll pay securely on Stripe. The code is emailed as soon as the payment goes through.</p>
    </form>
  );
}
