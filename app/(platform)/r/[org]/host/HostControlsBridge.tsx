import {
  HostToastProvider, MarkPaidButton, NotifyButton, PhoneBookingForm, RedeemButton, StatusButtons, WaitlistActions, WalkInForm,
} from "@/components/platform/HostControls";

/** The host stand's interactive pieces, in one namespace for the page. */
export const HostControls = {
  Toasts: HostToastProvider, Status: StatusButtons, WalkIn: WalkInForm, Phone: PhoneBookingForm, MarkPaid: MarkPaidButton,
  Redeem: RedeemButton, Waiting: WaitlistActions, Notify: NotifyButton,
};
