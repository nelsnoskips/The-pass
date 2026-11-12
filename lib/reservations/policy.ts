/**
 * The cancellation rule guests read, written from the same numbers the
 * refund code uses (venues.cancel_cutoff_hours and the booking's
 * deposit), so the words can never promise something the code won't do.
 * The owner's own policy text is shown as an extra note under it, never
 * instead of it. Pure: safe in the browser and in tests.
 */

const dollars = (cents: number) => (cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`);

/** "24 hours", "1 hour", "2 days" (whole days read better past 48 hours). */
export function cutoffPhrase(hours: number): string {
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24} days`;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** "24-hour", "3-day": the cut-off as an adjective. */
function cutoffAdjective(hours: number): string {
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24}-day`;
  return `${hours}-hour`;
}

/**
 * The rule as one or two sentences, e.g. "Cancel or change up to 24 hours
 * before and your $40 deposit comes back in full. After that it isn't
 * refunded." With no deposit there is nothing to lose, so it just asks.
 */
export function policySentence(cutoffHours: number, depositCents: number): string {
  const h = Math.max(0, Math.round(cutoffHours));
  if (depositCents > 0) {
    if (h === 0) return `Cancel any time before your booking and your ${dollars(depositCents)} deposit comes back in full.`;
    return `Cancel or change up to ${cutoffPhrase(h)} before and your ${dollars(depositCents)} deposit comes back in full. After that, it isn’t refunded.`;
  }
  if (h === 0) return "Plans change — you can cancel or change from your link any time before your booking.";
  return `Plans change — please cancel or change from your link at least ${cutoffPhrase(h)} before, so we can offer the table to someone else.`;
}

/** The generated rule plus the owner's note, ready to show. */
export function guestPolicy(cutoffHours: number, depositCents: number, ownerNote?: string | null): { rule: string; note: string | null } {
  const note = ownerNote?.trim() || null;
  return { rule: policySentence(cutoffHours, depositCents), note };
}

/** The moment the deposit stops being refundable. */
export function refundDeadline(startsAt: Date, cutoffHours: number): Date {
  return new Date(startsAt.getTime() - Math.max(0, cutoffHours) * 3_600_000);
}

/** Same test as lib/payments refundDepositIfDue: at or before the deadline counts. */
export function cancelledInTime(startsAt: Date, cutoffHours: number, now: Date): boolean {
  return startsAt.getTime() - now.getTime() >= Math.max(0, cutoffHours) * 3_600_000;
}

export type DepositState = "none" | "due" | "paid" | "refunded";

/** reservations.deposit_status, in the guest's terms. */
export function depositState(depositCents: number, status: string | null | undefined): DepositState {
  if (!depositCents || status === "none" || !status) return "none";
  if (status === "refunded") return "refunded";
  if (status === "held" || status === "captured") return "paid";
  return "due";
}

/**
 * What cancelling now would mean for the deposit, said plainly before the
 * guest confirms. Mirrors refundDepositIfDue(by: "guest").
 */
export function cancelOutcome(input: {
  startsAt: Date; cutoffHours: number; depositCents: number; depositStatus: string | null | undefined; now: Date;
}): { refund: boolean; text: string } {
  const state = depositState(input.depositCents, input.depositStatus);
  const amount = dollars(input.depositCents);
  if (state === "none") return { refund: false, text: "There’s no deposit on this booking, so there’s nothing to pay." };
  if (state === "due") return { refund: false, text: `Your ${amount} deposit hasn’t been paid, so there’s nothing to refund.` };
  if (state === "refunded") return { refund: false, text: `Your ${amount} deposit has already been refunded.` };
  if (cancelledInTime(input.startsAt, input.cutoffHours, input.now)) {
    return { refund: true, text: `Your ${amount} deposit will be refunded in full.` };
  }
  return {
    refund: false,
    text: `It’s past the ${cutoffAdjective(input.cutoffHours)} cut-off, so your ${amount} deposit won’t be refunded.`,
  };
}

/** After cancelling: what happened to the deposit. */
export function cancelledDepositText(depositCents: number, depositStatus: string | null | undefined): string | null {
  const state = depositState(depositCents, depositStatus);
  const amount = dollars(depositCents);
  if (state === "refunded") return `Your ${amount} deposit has been refunded. Card refunds usually show up within 5–10 days.`;
  if (state === "paid") return `This was cancelled after the cut-off, so the ${amount} deposit wasn’t refunded.`;
  if (state === "due") return `No deposit was taken, so there’s nothing to pay.`;
  return null;
}

export { dollars as formatDeposit };
