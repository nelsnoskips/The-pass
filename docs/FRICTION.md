# Friction we design against

What restaurants and diners complain about on OpenTable, Resy and
SevenRooms, and what The Pass does about each. Researched 2026-11-11.

**How solid this is.** Resy's and SevenRooms' pricing pages, Trustpilot,
Restaurant Dive, SF Standard, the Philadelphia Inquirer and CNN were
read directly. OpenTable's own pricing pages, Capterra, G2 and Software
Advice blocked the reader, so anything from them is a search-result
summary only (marked *snippet*). OpenTable's prices come from a
competitor's write-up, partly corroborated by SF Standard. No Reddit
threads were found, so operator-forum sentiment is not covered.
Trustpilot skews negative and the samples are small (141 and 265
reviews). Re-check prices before quoting them to a prospect.

## What they charge

| | Monthly | Per cover | Other |
|---|---|---|---|
| OpenTable Basic *(reported)* | $149 | $1.50 network; $0.25 own-website or $49 flat | 2% on deposits, no-show fees and prepaid (verified) |
| OpenTable Core / Pro *(reported)* | $299 / $499 | $1.00 network; own-website free | One-year auto-renewing contract |
| Resy Platform / 360 *(official)* | $289 / $459 | None | Tock-powered plans add 2–3% on prepayments |
| SevenRooms *(official)* | Quote only | "No cover fees" on Starter | Competitors report roughly $499–1,000 a venue on annual contracts |

## Restaurants

| Complaint | Evidence | What we do | State |
|---|---|---|---|
| Per-cover fees eat thin margins | G2 summary cites it in 16 reviews *(snippet)*; SF Standard: bills in "the thousands" | One flat fee per location. No fee per cover, ever, and none on the restaurant's own website | Engine has no fee concept; pricing to set |
| Lock-in: annual contracts, "system of record" terms | Restaurant Dive, Apr 2026: new OpenTable terms; trade group's biggest concern; Washington AG asked to review | Month to month. No exclusivity. Export everything — guests, bookings, history — in one click | Export to build |
| Double bookings when systems don't talk | Same article; Capterra review on the lost SevenRooms link *(snippet)* | The database refuses overlapping holds on a table whatever the source. During a switch, import the other system's bookings as holds | Guarantee built and tested; import to build |
| Who owns the guest | OpenTable blocked data sharing in 2019, then charged for it *(snippet)* | Guests belong to the restaurant's account. We never contact them for anyone else | Built (per-org guests, consent record) |
| Platform markets other restaurants to my guest | One Trustpilot anecdote *(snippet)*; unconfirmed | Confirmation and reminder messages mention only this restaurant | Built |
| A cut of deposits and no-show fees | OpenTable 2% (verified); Resy/Tock 2–3% (official) | Card processing at cost; no platform cut | Deposits to build |
| Bots, brokers, and now AI agents taking tables | Resy: broker bookings no-show at 4× the rate; NY law Feb 2025; CNN Sep 2026 | A booking belongs to a phone number: one live booking per phone per service, rate limits per phone and per network address, a deposit on the slots that get resold, and a flag for the host when a pattern looks like a broker | Phone identity built; limits and flags to build |
| Opaque pricing | SevenRooms publishes none | Prices on the website | When pricing is set |
| Guest data exposed through a vendor | SevenRooms breach, Dec 2022 | Hold only what a booking needs; every query scoped to one restaurant and tested; few vendors | Isolation built and tested |
| Setup is fiddly; weak offline | SevenRooms reviews *(snippet)* | We set up the floor and hours for them; host stand keeps working through a dropped connection | Host stand to build |
| Switching is a slog for staff | SF Standard | Import, a host stand that looks like what hosts know, and a person from the studio doing the move | To build |

What operators do **not** complain about, as far as this found: support
(Capterra 4.5 and 4.9 *snippet*), host-stand usability, outages. And
what they value is real: OpenTable brings the most diners. We don't
have a diner network. The answer is Reserve with Google, the
restaurant's own site and Instagram, and the ads agent — and letting a
restaurant run us alongside its old system while it finds out how many
network covers it actually needs.

## Diners

| Complaint | Evidence | What we do | State |
|---|---|---|---|
| Charged a cancellation or no-show fee they dispute | Top complaint on both Trustpilot pages, incl. marked no-show after dining | The policy is stated before booking and in the confirmation. A reminder with one-tap cancel goes out before the cut-off. A no-show charge needs a host to mark it, is logged with who and when, and can't be applied to a party that was seated | Status log built; reminders, policy text, deposits to build |
| Can't reach anyone | Resy removed live chat; OpenTable "an automated AI bot" | The restaurant's phone number is on every booking page and message. The restaurant is the support | Built |
| Forced account, codes that never arrive | Resy login reviews, 2026 | No account, no app, no code. A name and a mobile number | Built |
| Can't find how to change or cancel | ~10% of analysed Resy feedback (OnClarity) | Every confirmation carries a private link: cancel in one tap; change time or party size in place | Cancel built; change-in-place to build |
| Booking not honoured, or changed without a word | OpenTable reviews, 2026 | Closed days can't be booked. If the restaurant changes or cancels a booking, the guest is texted | Closures built; change notices to build |
| Nothing ever available | Resy reviews | "Tell me if a table opens": a notify list per service that texts in order when someone cancels | To build |
| Points they can't use | OpenTable review | Rewards are this restaurant's, spent at this restaurant | Loyalty wave |
| Too many messages | Weak evidence | Promotions only with recorded consent, at most one a week, 10am–8pm, STOP honoured | Built and tested |

**Don't lose what people like:** the notify list, a fast and clean
booking flow, loyalty, and being able to just phone and book without a
card.

## What this adds to the build

In order: rate limits and one-live-booking-per-phone; reminders with
one-tap cancel; change a booking in place; the notify list; change and
cancellation notices to guests; one-click export; import from the old
system; deposits with the policy shown up front and processing at cost.
