# The studio backend

Three things: a place to see clients and website projects, a proposal
generator, and the review tool that sends a mock to a client and gets
their notes back.

Nothing here works until a database is connected. Every page degrades to
a setup message rather than a stack trace, so a half-configured deploy
is legible instead of broken.

## Setting it up (about ten minutes)

1. **Postgres.** Create a free project at [neon.tech](https://neon.tech).
   Copy the **pooled** connection string — the pooled endpoint is the one
   that survives serverless; the driver already turns off prepared
   statements for pgbouncer.

2. **Mail.** Create a free account at [resend.com](https://resend.com)
   and make an API key. 3,000 emails a month is far more than this needs.
   Verify `madisonfour.com` as a sending domain, or leave `MAIL_FROM` on
   Resend's shared sender until you do.

3. **Environment.** In Netlify → Site configuration → Environment
   variables, add the keys from `.env.example`. The ones that matter:

   | Key | What it does |
   | --- | --- |
   | `DATABASE_URL` | Where everything is stored. Nothing works without it. |
   | `RESEND_API_KEY` | Sends your login link and the review notifications. |
   | `STUDIO_ALLOWED_EMAILS` | Comma-separated. Who may sign in at `/studio`. |
   | `STUDIO_EMAIL` | Where review notifications land. |

4. **Create the tables.** Locally, with `DATABASE_URL` set:

   ```
   npm run db:migrate
   ```

   Every statement is guarded, so running it twice is safe.

## Using it

**Sign in** at `/studio`. There is no password — you get a link by email
that works once and expires in twenty minutes. The session lasts thirty
days.

**Add a client**, then a project. The *mock path* is where the built site
lives on this domain, e.g. `/spec/orravan`. That is what the review link
frames.

**Open a round** on the project page. That produces a link like
`/review/<token>` — send it to the client. They can browse the mock,
pin comments to anything on it, and rewrite text in place. When they
submit, the notes land against the project and you get an email.

**Generate a proposal** at `/studio/proposals/new`. It renders at
`/proposals/<slug>` off the same stylesheet as the hand-built ones, so a
reader cannot tell which is which.

## Two things worth knowing

**The review token is the client's whole credential.** That is
deliberate: asking a restaurant owner to create an account before they
can say the logo is too big loses more feedback than an unguessable link
risks. The worst a leaked link allows is reading a mock and adding a
comment. Close the round when you are done with it.

**The two hand-built proposals keep their own pages.** `/proposals/hals`
and `/proposals/rebellion` are real files, and a static route always
beats the dynamic one. The generator refuses to save under either name
rather than writing a row that could never be served — a quote that has
already been sent should not change shape because a template did.
