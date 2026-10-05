# BLUE at the Gale — image manifest

Nothing here yet. The page is composed and lit without photography: every
frame paints its own stage light in CSS, so `/blue` reads as a finished
room today. Dropping a file in under the exact name below and flipping the
matching `src` in `lib/blue.ts` from `null` to `"/images/blue/<name>"` lays
the photograph over that same light — the grade underneath stays, which is
what keeps the page looking like one room rather than a contact sheet.

## Format and quality

- Supply **AVIF and WebP**; keep a JPEG only as the last fallback.
- Hero planes: ~2600px on the long edge. Everything else: ~1800px.
- Quality 82–86. Colour: sRGB.
- **No text baked into any photograph.** Dates, set times, artist names,
  menus and dress code are HTML on this page and must stay that way.
- The hero planes are the only images loaded eagerly. Everything below the
  fold is lazy, so weight there costs the guest nothing on arrival.

## The hero, separated (`HERO_PLANES` in `lib/blue.ts`)

The hero is five planes moving at different speeds. Supply them as
separate layers with transparency where noted; the sequence works with any
subset, and falls back to the painted stage for whatever is missing.

| File | Plane | Notes |
| --- | --- | --- |
| `hero-scrim.webp` | Rear scrim | Full bleed, no transparency. The wall behind the stage. Moves at 0.06 × scroll. |
| `hero-microphone.png` | Microphone | **Transparent PNG.** Centred, standing in the blue pool. Moves at 0.12 × scroll and is never animated itself. |
| `hero-curtain-left.png` | Left curtain | **Transparent PNG**, tall. Occludes ~28% of frame width at rest, drawn back over the first 35% of the scroll. |
| `hero-curtain-right.png` | Right curtain | Mirror of the left. |
| `hero-tables.png` | Foreground tables | **Transparent PNG.** Candlelit tables across the bottom third. Moves at 0.20 × scroll. |
| `hero-still.webp` | The flat frame | The whole scene as one image, curtains open. Used under reduced motion and with no JavaScript. |

If the layered plates are not available, supply `hero-still.webp` alone —
the parallax simply drops out and the curtains still open over it.

## This week at Blue (`WEEK`)

Portrait, 3:4, shot against the room's own darkness. One performer, at a
microphone, lit from a single source.

- `week-marcus-johnson.webp`
- `week-laura-chavez.webp`
- `week-nicole-arends.webp`

## Dinner to the after hours (`.blu-turnstage`)

**The one non-negotiable pair.** The same room, the same lens, the same
framing, photographed twice without moving the camera:

- `turn-warm.webp` — the dinner state, ~2700K, candles and warm wash.
- `turn-blue.webp` — the second-set state, deep cobalt, **skin tones kept
  warm**; a fully blue face reads as a colour cast, not as stage light.

A light wipe carries the blue state across the warm one from left to
right. If the two frames do not register pixel for pixel, the wipe reads
as a cut and the whole section fails.

## The rest

| File | Where |
| --- | --- |
| `bar-negroni.webp` | Behind the Bar, 4:5 portrait |
| `member-locker.webp` | Membership — a named brass bottle locker |
| `member-backbar.webp` | Membership — the back bar in low light |
| `member-crystal.webp` | Membership — personal glassware |
| `member-rooftop.webp` | Membership — the Gale rooftop at dusk |
| `private-basel.webp` | Private Events — a long table set for a buyout |
| `private-fashion.webp` | Private Events — the stage as a runway |
| `private-wedding.webp` | Private Events — the floor at a wedding |
| `private-corporate.webp` | Private Events — a standing reception |
| `room-wide.webp` | The Room — 16:10, house left, stage lit |
| `descent-gale.webp` | Finding it — the Gale on Collins at night |
| `descent-stair.webp` | Finding it — the stair down from the lobby |
| `descent-door.webp` | Finding it — the unmarked blue door |

## Avoid

Generic nightclub and DJ imagery, neon signage, Miami skylines, beaches,
palm trees, and anything with a logo or a caption burned into it.
