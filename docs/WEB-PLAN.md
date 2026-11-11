# Web plan: the site engine

How restaurant websites work on the platform. This is the Website
product (wave 1 in `AGENTIC-PLATFORM.md`), and the surface every later
product — booking, ordering, gift cards, sign-up — is served from.

Nothing here touches The Pass's own marketing site. Restaurant sites
live under their own routes and their own layout.

## Decisions

1. **One engine, many sites.** Every restaurant site is the same code
   rendering that restaurant's content. A bespoke design is a *theme*,
   not a separate codebase. This is what makes "describe the change"
   editing, and fixing every site at once, possible.
2. **Content is structured data, not pages.** A site is one typed JSON
   document (`SiteContent`: brand, theme tokens, hero, story, menus,
   hours, contact, announcements), validated on every write. Agents and
   editors change data; they never write markup.
3. **Versions, with publish as a pointer.** Every save is a new
   immutable row in `site_versions`. The live site is whichever version
   `sites.published_version_id` points at. Preview is any other version;
   rollback is moving the pointer back. An agent's edit is a new draft
   version waiting for approval — the same propose/approve shape as
   everything else.
4. **Path first, domains second.** Sites are served at `/s/<slug>`.
   Custom domains are a host→slug lookup in middleware added in phase 3;
   no page code changes when it lands.
5. **Server-rendered, fast, indexable.** Server components, no client
   JavaScript except the booking widget. Each site emits its own
   metadata and `Restaurant` JSON-LD (hours, menu, address, a
   `ReserveAction`) — the search and AI-answer discipline the studio
   already sells, built into the engine.
6. **Menus live in the content document for now.** Items carry stable
   ids and integer-cent prices so Ordering (wave 3) can promote them to
   a catalog table without re-keying.
7. **Booking is native.** `/s/<slug>/reserve` talks to the reservations
   engine directly: no iframe, no third-party widget, no per-cover fee.
   The guest gets a private link to view or cancel.

## Phases

| Phase | What | State |
|---|---|---|
| 1 | Schema (`sites`, `site_versions`), content type + validator, the Classic theme, public site, booking flow, manage-booking page, confirmation text, demo seed | **This phase** |
| 2 | Host stand (today's book, seat, no-show, walk-ins), restaurant logins from `org_members`, guest list screen | Next |
| 3 | Site editor (form + preview + publish + history), custom domains, per-site sitemap | |
| 4 | Website agent: describe the change → draft version → preview → approve | |
| 5 | Second theme, image uploads, Reserve with Google feed | |

## Guardrails

- Public pages read only published versions, by slug. Draft access
  needs a `Tenant`.
- The booking form is a public write: validated server-side, bounded by
  the venue's online limits, with a honeypot. Rate limiting by IP comes
  with phase 2.
- A booking confirmation is transactional and needs no marketing
  consent. The marketing opt-in is a separate, unticked checkbox, and
  its record is what the SMS rules read.
