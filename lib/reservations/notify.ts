import type { Sql } from "postgres";
import { sendSms, type SmsSender } from "../messaging/sms";
import type { Reservation } from "./repo";

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
  },
  sender: SmsSender = sendSms,
): Promise<void> {
  const { reservation: r } = input;
  // Walk-ins without a phone have nothing to text.
  if (!r.guestPhone.startsWith("+")) return;
  const body = `${input.restaurant}: you're booked for ${r.partySize} on ${input.when}. Change or cancel: ${input.manageUrl}`;
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
