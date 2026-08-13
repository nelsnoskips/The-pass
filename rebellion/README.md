# Rebellion Beachside Bar & Bistro — website

First build of the new Rebellion site, following the *Rebellion Brand Book ·
Website Plan · Commerce Blueprint*. Structure, design system and motion tokens
are real; **photography and copy are placeholders** meant to be replaced.

Built with Next.js 16 (App Router) · TypeScript · Tailwind CSS v4.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

This is a standalone app in the `rebellion/` folder of the repo — it has its
own dependencies and does not share anything with The Pass app at the root.

## Routes

| Route | Blueprint reference |
| --- | --- |
| `/` | §07 homepage blueprint — hero, choose your Rebellion, tonight strip, editorial, private events, bottle shop, social proof, visit |
| `/menus` | §06 Eat & Drink — indexable HTML menus, never PDFs |
| `/happenings` | §07 module 03 + §11 single event source (also emits Event schema) |
| `/private-events` | §08 venue page and the qualified lead form |
| `/bottle-shop` | §09 merchant's edit + §10 fulfillment gate |
| `/story` | §03 brand foundation |
| `/visit` | §07 module 08 — NAP, hours, access, FAQs |
| `/reserve` | Landing path for the reservation platform embed |

## Where things live

- `app/globals.css` — the whole design system: palette (§05), type scale,
  motion tokens (§08), reduced-motion rules. No component hard-codes a hex or
  a duration.
- `lib/motion.ts` — the same motion tokens for JS (observer thresholds,
  stagger). Mirrors the CSS; don't invent new values elsewhere.
- `lib/images.ts` — every photograph, addressed by **slot name** with the
  shoot-day brief from §12. Swapping a slot's `src` to a local file replaces
  that photo everywhere it appears.
- `lib/site.ts` — nav, hours, NAP, menus, happenings, occasions, bottles.
  This is the shape the CMS should target (§11).
- `components/ui/Reveal.tsx` — the one scroll-reveal primitive.
- `components/ui/Artwork.tsx` — the painted layer (below).

## The painted layer

The identity is watercolour, ink and torn paper, so the site carries real
artwork rather than CSS gradients — washes with granulated edges and pigment
rims, thrown ink with satellites and spray, deckled paper between sections,
painted edges on photographs, and the tooth of the stock under bone surfaces.

`scripts/generate-artwork.py` produces all of it procedurally and
deterministically:

```bash
python3 scripts/generate-artwork.py    # needs numpy + pillow
```

Two conventions make it maintainable:

- **Everything is an alpha mask.** `/public/artwork/*.png` is white with the
  shape in the alpha channel, and the components paint `currentColor` through
  it — so a Tailwind `text-*` class recolours any texture and every tint stays
  on a palette token. One file serves the whole palette (~650KB total).
- **Torn edges belong to the paper.** A `<Deckle>` is rendered inside the
  *dark* section it overlaps, tinted to match the paper doing the tearing.

Components: `<Bloom>`, `<InkSplatter>`, `<Deckle>`, `<BrushRule>`,
`<ChapterMark>`, plus the `art-frame` / `art-frame-portrait` classes for
photographs and `paper-grain` for surfaces. All of it is decorative —
`aria-hidden`, `pointer-events-none`, and hidden entirely where CSS masking
is unsupported rather than degrading into coloured rectangles.

When the illustrator delivers scanned washes and splatters, drop them into
`/public/artwork` following the same mask convention and nothing else needs to
change. The skeleton artwork is still outstanding — only the 1C logotype was
supplied — which is why the §08 signature moment is not built yet.

## Swapping the placeholder photography

Stock images are served from Unsplash and allowlisted in `next.config.ts`.
When the two shoot days land:

1. Drop the files in `public/images/`.
2. Point each slot in `lib/images.ts` at the local path and rewrite its `alt`.
3. Delete the `remotePatterns` entry in `next.config.ts`.

Each slot carries a `brief` describing what the real frame should show.

## Placeholders that must be confirmed before launch

Everything below is illustrative and marked `PLACEHOLDER` in the source:

- **NAP and hours** (`lib/site.ts`) — verify address, phone and service hours
  against the client's Google Business Profile.
- **Menus and prices** — illustrative.
- **Happenings** — sample events; the real calendar becomes the single source
  feeding the homepage rail, this page and the structured data.
- **Venue capacities, layouts, minimums** — pending the walkthrough.
- **"The Annex at Rebellion"** — a strategic working name only. Trademark,
  domain and handle clearance is required before public use (§08).
- **Bottle shop** — nothing transacts. Inventory, pricing, processor and
  fulfillment are §11 platform decisions, and the delivery radius in
  `components/shop/DeliveryChecker.tsx` is a guess. Licensing, age
  verification, service rules, packaging and recordkeeping must be confirmed
  with Florida ABT and counsel before this page can take an order (§10).
- **Forms** — the newsletter, event inquiry and delivery checker are
  client-side only. The §08 automation (CRM lead, owner notification,
  source/campaign capture, same-business-day SLA task) is not wired.
- **Reservations** — `/reserve` is a landing page with a placeholder panel
  where the booking widget embeds.
- **Social proof quotes** — written for layout, not attributed to real guests.

## Motion, and what is still to come

Implemented: reveal-on-scroll with stagger, the marquee, card lift and image
crop on hover, the transparent→bone navigation change, the floating Reserve
control after the hero, and a full `prefers-reduced-motion` path that drops
choreography while keeping content and focus.

Not yet built, from §08:

- The signature skeleton moment — ink strokes tracing the illustration on
  first entry, watercolour bloom, one restrained gesture. Needs the skeleton
  artwork (only the 1C logotype was supplied) and a Rive state machine.
- GSAP + ScrollTrigger for hero sequencing and scroll-linked progress. The
  current reveals are CSS + IntersectionObserver, which is lighter; adopt GSAP
  when the hero timeline gets more complex than it is today.
- The ambient hero clip behind the poster frame, deferred until interactive.

## Accessibility

WCAG 2.2 AA is the target (§11). In place: skip link, semantic landmarks,
visible focus rings, keyboard-operable carousel with real buttons and disabled
states, labelled form fields, no hover-only information, no autoplay, and
reduced-motion support. Not yet done: a full audit on real hardware, contrast
verification of the final photography treatments, and form error messaging.
