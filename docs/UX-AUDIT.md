# The Pass — UX and accessibility audit (2026-11-12)

An expert pass over the platform and the guest site at desktop (1440×900),
iPad Pro 11 landscape (the host stand) and iPhone 13, signed in as owner,
host and viewer, exercising the real jobs (walk-in, phone booking, seat,
no-show, guest booking/change/cancel, pickup order, 86ing, pausing,
approvals, chat, website editing) plus invalid input, double taps, slow
network, offline, back button, an empty new org, long names and 26 pending
proposals. Contrast computed from the OKLCH tokens. Every finding was
reproduced. Screenshots were kept locally with the audit.

Note: the audit ran before the marketing, agent-settings, chat-actions,
financials, reporting and guest-profile work was merged; re-check each
finding against the current code before fixing.

## Critical

- **C1. A failed submit wipes the form** — guest booking (`/s/[site]/reserve`), guest ordering (`/s/[site]/order`) and host phone booking/walk-in. React 19 resets uncontrolled fields after a `<form action>` completes even on error; the chosen time resets too and the stale error stays. Fix: controlled fields (or echo values back as defaultValue) in `components/sites/BookingWidget.tsx`, `components/sites/OrderBuilder.tsx`, `components/platform/HostControls.tsx`; clear the error on edit; focus the failing field with `aria-invalid`.
- **C2. A network failure blanks the page** — offline guest booking shows "Application error"; an offline Seat tap throws "Failed to fetch" on the host stand. No `error.tsx` anywhere. Fix: `error.tsx` for `(platform)/r/[org]` and `(sites)/s/[site]` that keep the shell with Retry; wrap server-action calls in try/catch returning inline errors; an Offline bar from `navigator.onLine`.
- **C3. The host stand double-seats a table and doesn't flag late parties** — a walk-in auto-seated at T5 while a 2h47m-late booking still held T5; seating the late party succeeded, leaving two live seated parties on T5. Fix: refuse seating onto a table with a currently seated party in `setStatus(...'seated')` (`lib/reservations/repo.ts`) or require another table; "Late 2:47" pill past start + 15 min; "T5 occupied by Walk-in (7:47)"; Seat opens a table picker; late parties sorted to the top.
- **C4. One-tap irreversible actions, including on future days** — status transitions only move forward (no undo); Seat sits 6px from No-show with 34px targets on iPad; kitchen "Cancel · text guest" and guest "Cancel this reservation" have no confirmation; the cancelled page doesn't mention the deposit; Seat/No-show are live on future dates. Fix: 15-minute reversals (seated→booked, completed→seated, no_show→booked) logged as `reservation.undo` with a 10-second Undo toast; Seat/No-show only for today (No-show only after the grace period); 44px targets under `@media (pointer: coarse)`; two-step guest cancel stating the refund outcome; confirm with reason for order cancel.
- **C5. The kitchen board and host stand never update on their own** — new orders and website bookings appear only on reload; no chime; tickets don't show age or lateness. Fix: refresh every 10–15 s and on `visibilitychange`; chime with mute; `(1) New order` in the title; "Placed 6 min ago" and a red Late past ready time.
- **C6. The cancellation policy guests read can disagree with the refund rule that runs** — the policy text can be changed (including by the assistant) without changing `cancel_cutoff_hours`, which `lib/payments/index.ts` uses for refunds; the confirmation page shows neither the policy nor the deposit. Fix: generate the policy sentence from the cutoff and deposit (free text only as an addition), or validate and block mismatches (also from the lever); show deposit status and the exact refund deadline (venue time) on the booking page and in confirmation texts.
- **C7. Phone visitors can't reach Order online or Gift cards** — `.site-nav .site-links` is hidden under 760px with nothing replacing it. Fix: a menu button (Menu, Order online, Gift cards, Hours, Call) in `components/sites/SiteShell.tsx`, and an "Order pickup" hero button in `components/sites/SiteHome.tsx` when ordering is on.
- **C8. Platform text fails WCAG AA contrast** — `--faint` 3.4–3.7:1 on panels (labels, table headers, nav headings, metric labels, change-log "who"); done/no-show rows at `opacity:.42` drop to 1.8–2.3:1; `--stop` on `--stop-soft` 4.05:1; input borders 1.41:1 (needs 3:1). Fix: `--faint: oklch(0.64 0.012 60)`; `--stop: oklch(0.68 0.13 25)`; done rows `opacity:1` with `color: var(--muted)`; input borders `oklch(1 0 0 / .38)`; 9.5–10.5px uppercase labels to ≥ 11.5–12px. The guest site passes.

## High

- **H1. Dates and times in UTC, not the restaurant's time** — `formatLever` (pause "until 11:31 PM" instead of 6:31 PM), Messages log, Guests, Gift cards, Reviews. Fix: venue timezone everywhere; `tz` on `formatLever`; a unit test run with `TZ=UTC` expecting New York times.
- **H2. Kitchen board below the fold on iPad; 86ing takes two scrolls** — settings grid and change log first, duplicated settings, sold-out strip under the tickets, sold-out chips styled as "selected", "Give menu item ids" copy. Fix: tickets first, a sticky Pause/86 bar, settings collapsed; 86'd dishes red and struck through; "Nothing's 86'd."
- **H3. No waitlist on the host stand** — a walk-in that doesn't fit gets a dead end; guests' "text me if a table opens" sign-ups never appear in the platform. Fix: a Waitlist panel (quoted waits, "Text: table ready", Seat, today's notify-list entries); "Add to waitlist · quote 25 min" when nothing is free.
- **H4. Approvals are buried and don't show who gets texted** — the bell goes to /agents where the queue is under the cards; 26 pending = 13,000px; cards don't list recipients, send time or consent; copy not editable; "Approve & send" sends immediately; stale proposals not marked or re-checked; agent card says "Not run yet" next to its own proposal. Fix: bell → queue first; recipient list with checkboxes and consent; editable copy; "Sends now to 3 guests" confirm then Undo; target date and re-check on approve; stale > 24h; "Dismiss all from this agent".
- **H5. Order errors don't name the dish; brunch dishes orderable at dinner** — "Something in your order is no longer available" with the 86'd item left in the cart; a weekend-brunch dish ordered for Wednesday 8:30 PM. Fix: return the unavailable ids and remove/mark them ("Baklava just sold out — removed"); filter items by the menu served at the chosen time.
- **H6. Guest pages leave out the phone number and deposit** — booking page lacks phone, deposit, policy and add-to-calendar; order status says "call the restaurant" with no number or address. Fix: `tel:` links, address with map link, `.ics`, deposit line.
- **H7. Messages page radios render broken; Send has no confirm** — radios as 40px grey discs; no preview/count before sending; log table cut off on iPad; viewers can see guests' private booking manage links in the log. Fix: exclude radio/checkbox from `.pf-field input` styles; "Review & send to N guests" confirm; `overflow-x:auto`; mask tokens.
- **H8. Floor table headers misaligned; a Save per table** — "Online" over the seat range, "In use" over Online; 17 Save buttons; unlabelled inputs. Fix: one grid/real table, aria-labels, a single "Save changes" with a dirty-state bar.
- **H9. A new restaurant hits a dead end; reporting shows false zeros** — "No venues yet" with no way forward; "$0 spent on ads · 0 results" with nothing connected. Fix: onboarding empty state; "—" when no ad source is connected.
- **H10. Website edits lost silently on sidebar navigation** — only `beforeunload` is handled. Fix: guard in-app navigation while dirty, and autosave the draft.

## Medium

1. False zeros and green arrows on Home when last week has no data (org newer than a week); Reviews "0 reviews" while Google isn't connected → "—" / "Not connected".
2. Booking with an existing guest's phone overwrites their name (`on conflict … set name = excluded.name`) → keep the known name (record the new one as a note/alias); search results should deep-link and highlight.
3. Phone layouts: platform nav strip has no scroll cue (cut at "Orde"); host-stand stat tiles fill the first phone screen; `/website` scrolls sideways at 390px; order status page overflows 4px.
4. No loading feedback (`loading.tsx`) → skeletons/progress.
5. Search can't find "8pm"/"tonight"; shows raw +1 phone numbers and status codes like `no_show`.
6. Disconnect (Google/Meta) and gift-card "Take it off the card" have no confirmation; show the resulting balance first.
7. Connections named by vendor (Twilio, Resend, "Claude (Anthropic)") instead of job; no banner when texting is off although the booking page promises a text; "Toast — Coming" still shows Connect.
8. Developer-facing copy in chat/website agent ("ANTHROPIC_API_KEY", "menu on the left" on phones).
9. Change cards inconsistent about who; Undo offered on an expired pause.
10. Website hours are free text separate from service periods → generate from service periods.
11. Screen readers: host-stand buttons announced without the guest ("Seat" ×20); charts have no values.
12. Host sessions expire on a fixed 30-day date with email-link sign-in only → sliding renewal, device PIN for hosts.
13. Guest gift-card page promises online sales and then says they're sold at the restaurant; phone not a link.

## Low

No skip link; weak search focus indicator; tap targets under 44px (host-row phone links 18px, side nav 34px, guest "+" 38px, "Team" 19px); stale time chips stay clickable while times reload; long org names shrink the mark; stale CSS comments ("electric blue"); a path shown as copy on Gift cards; no "Tonight/Tomorrow" chips or next-available suggestion on a full day.

## Keep

Fast walk-in seating (one tap, auto table); no duplicates on double taps; confirmations that explain consequences; change cards and per-page change logs (the strongest trust feature); approvals show "the text, as guests will get it"; lean guest booking (no account, one screen, policy and deposit shown before booking, notify-list fallback); clear pause copy; self-refreshing order status; specific gift-card errors; reduced motion respected; guest site passes AA; roles behave correctly; host stand dates correct across UTC midnight; Ctrl+K from anywhere.
