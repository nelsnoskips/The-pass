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
  const body = `${input.restaurant}: you're booked for ${r.partySize} on ${input.when}. Change or cancel: ${input.manageUrl}`;
  const result = await sender(r.guestPhone, body);
  await sql`
    insert into guest_messages (org_id, guest_id, kind, body, status, provider_id, error, sent_by)
    values (${input.orgId}, ${r.guestId}, 'transactional', ${body}, ${result.status},
            ${result.status === "sent" ? result.providerId : null},
            ${result.status === "failed" ? result.error : null}, 'system')`;
}
