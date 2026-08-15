import clsx from "clsx";
import { formatUsd, getPortalProject } from "@/lib/portal";

export const metadata = { title: "Billing — The Pass" };

const INVOICE_STATUS_LABEL = {
  paid: "Paid",
  open: "Open",
  upcoming: "Upcoming",
} as const;

/**
 * Billing: the payment schedule as it applies to this project, invoice by
 * invoice. Card management and receipts live in Stripe's hosted customer
 * portal; the button activates when STRIPE_CUSTOMER_PORTAL_URL is set.
 */
export default function BillingPage() {
  const project = getPortalProject();
  const stripePortalUrl = process.env.STRIPE_CUSTOMER_PORTAL_URL;
  const paid = project.invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      <p className="mk-label text-[#4B1719]">Billing</p>
      <h1 className="mt-5 font-editorial text-[36px] leading-[1.06] text-[#0A0A09] sm:text-[46px]">
        No surprises,{" "}
        <em className="italic text-[#4B1719]">ever.</em>
      </h1>
      <p className="mt-5 max-w-[540px] text-[15px] leading-relaxed text-[#1A1310]/75">
        {project.package} is {formatUsd(project.packagePrice)}, paid in
        three parts: forty percent to begin, thirty when you approve your
        design direction, thirty at launch. {formatUsd(paid)} of it is
        settled so far.
      </p>

      <ol className="mt-14 border-t border-[#0A0A09]/15">
        {project.invoices.map((invoice) => (
          <li
            key={invoice.id}
            className="grid gap-x-8 gap-y-2 border-b border-[#0A0A09]/15 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-baseline"
          >
            <p
              className={clsx(
                "mk-label w-24",
                invoice.status === "paid" && "text-[#83A978]",
                invoice.status === "open" && "text-[#4B1719]",
                invoice.status === "upcoming" && "text-[#1A1310]/45",
              )}
            >
              {INVOICE_STATUS_LABEL[invoice.status]}
            </p>
            <div>
              <p className="text-[15px] text-[#0A0A09]">{invoice.label}</p>
              <p className="mt-1 text-[13px] text-[#1A1310]/60">
                {invoice.date} · {invoice.id}
              </p>
            </div>
            <p className="font-editorial text-[24px] text-[#0A0A09]">
              {formatUsd(invoice.amount)}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-12 max-w-[540px]">
        {stripePortalUrl ? (
          <>
            <a
              href={stripePortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mk-label group inline-flex items-center gap-3 bg-[#0A0A09] px-6 py-3.5 text-[#F1EDE5] transition-colors hover:bg-[#4B1719]"
            >
              Manage cards &amp; receipts
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </a>
            <p className="mt-4 text-[13px] leading-relaxed text-[#1A1310]/60">
              Opens our payment partner, Stripe, where your cards, invoices,
              and receipts live. We never see or store your card details.
            </p>
          </>
        ) : (
          <p className="border border-[#B79A68]/40 bg-white/50 p-6 text-[13.5px] leading-relaxed text-[#1A1310]/70">
            Invoices arrive by email with a secure payment link. Card
            management and receipts will open here once online billing is
            activated for your account.
          </p>
        )}
      </div>
    </>
  );
}
