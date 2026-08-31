# scripts

## og-card.py

Regenerates `public/images/og-card.jpg`, the 1200×630 card every platform
shows when a link to the site is shared.

```bash
python3 scripts/og-card.py
```

It composes the card rather than cropping a photograph, because the card
is seen at thumbnail size in a feed and a cropped room says nothing that
small — the wordmark and one line of proposition do. The brand faces are
vendored in `og-fonts/` (DM Serif Display, Instrument Serif italic, Inter
SemiBold) so the script runs without network access and the card cannot
drift from the site's typography.

Requires Pillow. Edit the script if the proposition line changes; the
card is a build artifact, not a hand-edited image.

## invoice.mjs

Issues a project invoice in Stripe from the terms in the signed
agreement.

```bash
npm run invoice -- orravan deposit --dry-run   # print it, touch nothing
npm run invoice -- orravan deposit             # create a draft
npm run invoice -- orravan deposit --send      # finalize and email it
```

Milestones are `deposit` and `launch`. Amounts, due dates and footer
text live in the `BILLING` block at the top of the script, each figure
noted with the clause of the agreement it comes from — an invoice that
disagrees with what was signed is worse than no invoice, so the numbers
have one home rather than being retyped into the dashboard.

A draft is the default because finalizing a Stripe invoice emails the
client and cannot be undone. Every write carries an idempotency key
built from the client and the milestone, so a second run resumes onto
the same invoice instead of billing twice. A live key needs `--live`
as well.

Set `STRIPE_SECRET_KEY` in `.env.local`. It is read only here, on your
own machine — the site never uses it, and it does not belong in
Netlify.

Adding a client is a new entry in `BILLING`, not a new script.
