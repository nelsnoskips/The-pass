import type { Sql } from "postgres";
import { sendSms, type SmsSender } from "../messaging/sms";
import { policySentence } from "./policy";
import type { Reservation } from "./repo";

/** The booking confirmation's words. */
export function confirmationText(input: {
  reservation: Pick<Reservation, "partySize" | "depositCents">;
  restaurant: string; when: string; manageUrl: string;
  policy?: { cutoffHours: number; note?: string | null };
}): string {
  const r = input.reservation;
  const rule = input.policy ? ` ${policySentence(input.policy.cutoffHours, r.depositCents)}` : "";
  // A long note would split the text into many parts; the booking page
  // behind the link always shows it in full.
  const n = input.policy?.note?.trim() ?? "";
  const note = n && n.length <= 160 ? ` ${n}` : "";
  return `${input.restaurant}: you're booked for ${r.partySize} on ${input.when}.${rule}${note} Change or cancel: ${input.manageUrl}`;
}

/**
 * The text a guest gets when they book. Transactional: it is about their
 * own reservation, so it needs no marketing consent, and it says nothing
 * promotional. Recorded in guest_messages either way.
 */
export async function sendBookingConfirmation(
  sql: Sql,
  input: {
    orgId: string;
    reservation: Reservation;
    restaurant: string;
    /** Already formatted in the venue's timezone, e.g. "Fri, Nov 13 at 7:30 PM". */
    when: string;
    manageUrl: string;
    /** The venue's cut-off and the owner's note: the rule is written from
     *  the same numbers the refund uses (see ./policy). */
    policy?: { cutoffHours: number; note?: string | null };
  },
  sender: SmsSender = sendSms,
): Promise<void> {
  const { reservation: r } = input;
  // Walk-ins without a phone have nothing to text.
  if (!r.guestPhone.startsWith("+")) return;
  const body = confirmationText(input);
  const result = await sender(r.guestPhone, body);
  await sql`
    insert into guest_messages (org_id, guest_id, kind, body, status, provider_id, error, sent_by)
    values (${input.orgId}, ${r.guestId}, 'transactional', ${body}, ${result.status},
            ${result.status === "sent" ? result.providerId : null},
            ${result.status === "failed" ? result.error : null}, 'system')`;
}

/** When the restaurant cancels, the guest hears it from the restaurant,
 *  not by turning up to a table that isn't there. */
export async function sendCancellationNotice(
  sql: Sql,
  input: { orgId: string; guestId: string; phone: string; restaurant: string; when: string; restaurantPhone: string | null },
  sender: SmsSender = sendSms,
): Promise<void> {
  if (!input.phone.startsWith("+")) return;
  const call = input.restaurantPhone ? ` Please call us at ${input.restaurantPhone}.` : "";
  const body = `${input.restaurant}: we've had to cancel your reservation for ${input.when}. We're sorry.${call}`;
  const result = await sender(input.phone, body);
  await sql`
    insert into guest_messages (org_id, guest_id, kind, body, status, provider_id, error, sent_by)
    values (${input.orgId}, ${input.guestId}, 'transactional', ${body}, ${result.status},
            ${result.status === "sent" ? result.providerId : null},
            ${result.status === "failed" ? result.error : null}, 'system')`;
}
