"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { buyGiftCard } from "@/lib/giftcards/actions";
import { guard } from "./net";

const AMOUNTS = [25, 50, 100, 150];

/** Every field is held here, so a failed or dropped submit keeps it all. */
export function GiftCardForm({ slug }: { slug: string }) {
  const [amount, setAmount] = useState<string>("50");
  const [custom, setCustom] = useState("");
  const [gift, setGift] = useState(true);
  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);

  const edit = (set: (v: string) => void) => (e: { target: { value: string } }) => { set(e.target.value); setError(null); };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    start(async () => {
      const r = await guard(() => buyGiftCard({ error: null }, form));
      setError(r.ok ? r.value.error : r.error);
      requestAnimationFrame(() => errorRef.current?.focus());
    });
  };

  return (
    <form onSubmit={submit} className="site-panel site-stack">
      <input type="hidden" name="site" value={slug} />
      <div className="site-hp" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div>
        <p className="site-legend" id="gc-amount">Amount</p>
        <div className="site-times" role="group" aria-labelledby="gc-amount">
          {AMOUNTS.map((a) => (
            <button key={a} type="button" className="site-time" aria-pressed={amount === String(a)} onClick={() => { setAmount(String(a)); setError(null); }}>${a}</button>
          ))}
          <button type="button" className="site-time" aria-pressed={amount === "custom"} onClick={() => { setAmount("custom"); setError(null); }}>Other</button>
        </div>
        <input type="hidden" name="amount" value={amount} />
        {amount === "custom" && (
          <div className="site-field" style={{ marginTop: 10 }}>
            <label htmlFor="gc-custom">Amount in dollars ($10–$500)</label>
            <input id="gc-custom" name="custom" type="number" min={10} max={500} step={1} inputMode="numeric" required value={custom} onChange={edit(setCustom)} />
          </div>
        )}
      </div>
      <label className="site-check"><input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} /><span>Send it to someone as a gift</span></label>
      {gift && (
        <>
          <div className="site-row">
            <div className="site-field"><label htmlFor="gc-to">Their name</label><input id="gc-to" name="toName" required value={toName} onChange={edit(setToName)} /></div>
            <div className="site-field"><label htmlFor="gc-toe">Their email</label><input id="gc-toe" name="toEmail" type="email" required value={toEmail} onChange={edit(setToEmail)} /></div>
          </div>
          <div className="site-field"><label htmlFor="gc-msg">A note (optional)</label><textarea id="gc-msg" name="message" maxLength={500} value={message} onChange={edit(setMessage)} /></div>
        </>
      )}
      <div className="site-row">
        <div className="site-field"><label htmlFor="gc-name">Your name</label><input id="gc-name" name="name" autoComplete="name" required value={name} onChange={edit(setName)} /></div>
        <div className="site-field"><label htmlFor="gc-email">Your email</label><input id="gc-email" name="email" type="email" autoComplete="email" required value={email} onChange={edit(setEmail)} /></div>
      </div>
      {error && <p className="site-error" role="alert" ref={errorRef} tabIndex={-1}>{error}</p>}
      <button className="site-btn large" disabled={pending}>{pending ? "One moment…" : "Continue to payment"}</button>
      <p className="site-note">You&rsquo;ll pay securely on Stripe. The code is emailed as soon as the payment goes through.</p>
    </form>
  );
}
