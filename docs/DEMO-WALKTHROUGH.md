# The Pass — 10-minute demo

For the weekend demo (Nov 28–29). Everything runs on the test deploy with
demo data; payments, texts and emails are dry runs, and that's said out
loud, not hidden.

## Saturday: get it running (no cost)

1. **Neon** (neon.tech, free): new project `pass-test` → copy the
   connection string.
2. **Netlify → Site configuration → Environment variables**, scoped to
   *Branch deploys* only (not Production):
   - `DATABASE_URL` = the Neon string
   - `INTEGRATIONS_KEY` = any 40+ random characters
   - `AGENT_CRON_SECRET` = any 40+ random characters
   - `DEMO_SETUP` = `1`
   - `DEMO_OWNER_EMAIL` = your email
   - optional `ANTHROPIC_API_KEY` (small prepaid credit) — only if you
     want Ask The Pass to answer live
3. **Netlify → Build & deploy → Branches and deploy contexts**: add the
   branch `claude/elegant-galileo-cy6lst`. Wait for the build (it applies
   the schema, loads Santorini with four weeks of history and the next
   seven days of bookings, and adds your login).
4. **Sign in**: open `<branch address>/login`, enter your email, then in
   Netlify → Logs → Functions find `[platform:login-link] https://…` and
   open that link. Do it on the iPad too (one link per device).
5. Check these four open: `/r/santorini`, `/r/santorini/host` (iPad),
   `/s/santorini` (phone), `/platform`.

Each later deploy keeps your data; the demo week only fills days that are
empty. The demo days are filled from the deploy date, so deploy on
Saturday (or later) rather than earlier in the week.

## Sunday: the walkthrough

Have three screens ready: **phone** (guest), **iPad** (host stand,
signed in), **laptop** (Home, signed in).

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00 | Laptop · `/platform` | Show the headline, scroll to "The pass" | "Every restaurant has a pass: every plate is checked there before it goes out. The Pass is one agent that runs your front of house — and nothing leaves the pass without you." |
| 1:00 | Laptop · `/r/santorini` | Point at **Your morning pass** | "This is what an owner reads at 9am: last night, tonight against a usual Sunday, what's waiting for a decision, what The Pass did. One page instead of six logins." |
| 2:00 | Phone · `/s/santorini` | Tap **Reserve** → *Tonight* → a time → name, mobile, note "celebrating" → **Book** | "This is the restaurant's own site. No account, no app, no per-cover fee. The guest gets one link to change or cancel." Show the confirmation page: policy, deposit line, Add to calendar. |
| 3:30 | iPad · Host stand | Pull to the top or wait ~12 s (it refreshes and chimes) — the booking is there with the note | "It's on the stand before the guest has put their phone away. Notes, visit count, allergies — at a glance." |
| 4:30 | iPad · Host stand | Seat a party → show the **Undo** toast; show **Tables now** | "One tap to seat, fifteen minutes to undo a mis-tap. It won't let you put two parties on one table." |
| 5:30 | Laptop · **Stations** (bell) | Open the waiting proposal **Text 8 regulars about Tuesday**: the reason, the exact text, the eight names with consent | "Tuesday is quiet. The Pass found regulars who haven't been in for six weeks and wrote the text — but it waits for you. Nothing reaches a guest without passing you." Don't press send (texting is a dry run anyway). |
| 7:00 | Laptop · **Ask The Pass** | Ask "How does tonight look?" (live only if the AI key is set) | With the key: it answers from the real book. Without: "The assistant is switched on per restaurant; here's what it changes" → open an earlier change card: before → after, Apply, Undo. |
| 8:00 | Phone · `/s/santorini/app` then **Order** | Add two dishes → pick a time → **Place order** | "Their own app and their own ordering — no marketplace commission." |
| 9:00 | iPad · **Orders** | The ticket appears (refresh/chime) → **Accept** | "Same system, same guest record. The kitchen board, the book, the texts, the reviews — one memory." |
| 9:30 | Laptop · `/platform/pricing` | Close | "One flat price per location, no per-cover fees, month to month." |

## If something goes wrong

- **No login link in the logs**: check `DEMO_OWNER_EMAIL` matches what you
  typed on `/login`; links last a short time — request a new one.
- **Host stand empty**: the demo week is filled from the deploy date;
  redeploy (Deploys → Trigger deploy) and it fills the missing days.
- **Ask The Pass says it isn't switched on**: no `ANTHROPIC_API_KEY` on
  the branch deploy — use the change-card path instead.
- **"Texting is off" banner**: expected; say texts are switched on per
  restaurant once its number is registered.

## What not to claim

Payments, texts and emails are dry runs; Google, Meta and Toast aren't
connected on the demo; push notifications and app-store listings aren't
built. Say so if asked — honesty about scope is part of the pitch.
