/**
 * Issues a project invoice in Stripe from the terms in the signed
 * agreement, rather than from whatever gets typed into the dashboard at
 * the time.
 *
 *   node scripts/invoice.mjs orravan deposit --dry-run
 *   node scripts/invoice.mjs orravan deposit          # creates a draft
 *   node scripts/invoice.mjs orravan deposit --send   # finalizes and emails
 *
 * Three deliberate choices:
 *
 * A draft is the default. Finalizing a Stripe invoice emails the client
 * and cannot be undone, so sending is an explicit flag and never a
 * side effect of running the script.
 *
 * Every POST carries an idempotency key derived from the client and the
 * milestone, so running this twice produces one invoice rather than two.
 * That is the failure that actually costs something here.
 *
 * The terms live in BILLING below, quoting the agreement they came
 * from. An invoice that disagrees with the signed agreement is worse
 * than no invoice, so the numbers have one home.
 */

const API = "https://api.stripe.com/v1";

/* ------------------------------------------------------------ terms -- */

/**
 * Amounts are in cents, the way Stripe holds them, so nothing is
 * rounded on the way in. `source` is the clause each figure comes from.
 */
const BILLING = {
  orravan: {
    company: "Orravan Mechanical",
    email: "hello@orravan.ai",
    agreement: "/proposals/orravan-agreement",
    source: "Orravan Mechanical — Project Scope & Agreement, §2 Fees and payment",
    total: 400000,
    daysUntilDue: 15,
    scope:
      "Website redesign: nine pages (Home, About, Team, Services, Building " +
      "Automation Systems, HVAC Systems, Support, Contact, Service Portal) at " +
      "$2,500, plus three integrations — booking, payments, and ServiceTrade — " +
      "at $500 each. Total project fee $4,000, invoiced in two milestones.",
    footer:
      "Due within 15 days. Overdue amounts accrue interest at 1.5% per month. " +
      "Terms per the signed Project Scope & Agreement, madisonfour.com/proposals/orravan-agreement. " +
      "Madison Four — Nelson Schnebelen, Torrance, California.",
    milestones: {
      deposit: {
        amount: 200000,
        label: "Deposit — 50% of the $4,000 project fee, due on signing",
        detail: "Work begins on receipt. Non-refundable once concept work has been presented.",
      },
      launch: {
        amount: 200000,
        label: "Balance — 50% of the $4,000 project fee, due at launch",
        detail: "Payable when the completed website is made live or delivered for client hosting.",
      },
    },
  },
};

/* ------------------------------------------------------------- args -- */

const [, , clientKey, milestoneKey, ...flags] = process.argv;
const dryRun = flags.includes("--dry-run");
const send = flags.includes("--send");

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

const client = BILLING[clientKey];
if (!client) {
  die(
    `Unknown client "${clientKey ?? ""}". Known: ${Object.keys(BILLING).join(", ")}\n` +
      "Usage: node scripts/invoice.mjs <client> <milestone> [--dry-run] [--send]",
  );
}
const milestone = client.milestones[milestoneKey];
if (!milestone) {
  die(
    `Unknown milestone "${milestoneKey ?? ""}" for ${client.company}. ` +
      `Known: ${Object.keys(client.milestones).join(", ")}`,
  );
}

const money = (cents) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/* ------------------------------------------------------- the preview -- */

console.log(`\n${client.company} — ${milestoneKey}`);
console.log(`  ${milestone.label}`);
console.log(`  ${money(milestone.amount)}, net ${client.daysUntilDue}`);
console.log(`  Bill to: ${client.email}`);
console.log(`  Source:  ${client.source}\n`);

if (dryRun) {
  console.log("Dry run — nothing sent to Stripe.");
  process.exit(0);
}

/* ------------------------------------------------------------ stripe -- */

const key = process.env.STRIPE_SECRET_KEY;
if (!key) die("STRIPE_SECRET_KEY is not set. Nothing to do.");
if (key.startsWith("sk_live") && !flags.includes("--live")) {
  die("That is a live key. Re-run with --live if you mean it.");
}

/** Stripe's API is form-encoded, including nested keys like metadata[x]. */
function encode(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object" && !Array.isArray(v)) out.push(encode(v, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.filter(Boolean).join("&");
}

async function stripe(method, path, body, idempotencyKey) {
  const headers = {
    authorization: `Bearer ${key}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? encode(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    die(`Stripe ${method} ${path} failed: ${json.error?.message ?? res.status}`);
  }
  return json;
}

// One key per client+milestone. Re-running after a crash resumes onto
// the same objects instead of billing the client twice.
const idem = (step) => `madisonfour:${clientKey}:${milestoneKey}:${step}`;

/* Customer: matched on email so a second milestone lands on the same
   record and the client sees one history, not two. */
const found = await stripe("GET", `/customers?email=${encodeURIComponent(client.email)}&limit=1`);
const customer =
  found.data?.[0] ??
  (await stripe(
    "POST",
    "/customers",
    { name: client.company, email: client.email, metadata: { studio_client: clientKey } },
    idem("customer"),
  ));
console.log(`Customer ${customer.id}${found.data?.[0] ? " (existing)" : " (created)"}`);

/* The invoice is created before its line item and told to ignore any
   pending items, so it can only ever contain what this script puts on
   it — a stray invoice item left on the customer cannot ride along. */
const invoice = await stripe(
  "POST",
  "/invoices",
  {
    customer: customer.id,
    currency: "usd",
    collection_method: "send_invoice",
    days_until_due: client.daysUntilDue,
    pending_invoice_items_behavior: "exclude",
    auto_advance: false,
    description: client.scope,
    footer: client.footer,
    metadata: {
      studio_client: clientKey,
      milestone: milestoneKey,
      agreement: client.agreement,
    },
  },
  idem("invoice"),
);

await stripe(
  "POST",
  "/invoiceitems",
  {
    customer: customer.id,
    invoice: invoice.id,
    currency: "usd",
    amount: milestone.amount,
    description: `${milestone.label}. ${milestone.detail}`,
  },
  idem("item"),
);

if (!send) {
  console.log(`\nDraft invoice ${invoice.id} — ${money(milestone.amount)}`);
  console.log(`  https://dashboard.stripe.com/invoices/${invoice.id}`);
  console.log("  Review it there and send, or re-run with --send.");
  process.exit(0);
}

const finalized = await stripe("POST", `/invoices/${invoice.id}/finalize`, {}, idem("finalize"));
const sent = await stripe("POST", `/invoices/${invoice.id}/send`, {}, idem("send"));

console.log(`\nSent ${finalized.number} — ${money(milestone.amount)} to ${client.email}`);
console.log(`  ${sent.hosted_invoice_url}`);
