# Asset Plan — HOUSE ISSUE

**Category:** Neighborhood deli / rotisserie · **Mood:** warm, kraft, press-orange, near-black ink
**Date:** 2026-08-18 · **Higgsfield balance at planning time:** 1,200 credits (Plus)

## Hero concept — "The bird turns"

The hero stops being a photograph and becomes the working day. The visitor
lands on a rank of chickens just loaded onto the spit, pale and raw under the
elements. As they scroll, the spit turns and the birds cook — skin deepening,
fat rendering, drippings falling — and the hero resolves on the finished birds
with the masthead and both CTAs sitting over them.

- **Opening frame** — five whole chickens on a steel spit behind case glass,
  skin pale gold, elements glowing above, everything else falling to black.
  Negative space in the upper third for the HOUSE ISSUE masthead.
- **Transformation** — one slow revolution of the spit. Skin browns, fat
  glistens, drippings fall. One direction, no return, locked-off camera.
- **Resting frame** — the birds burnished and done, still centered, a finished
  composition that holds while the headline and CTAs are read.

## The scroll idea (no credits — this is the part that makes it innovative)

The video is not played, it is **scrubbed**: scroll position drives the
playhead, so the visitor cooks the chickens themselves.

Layered into the parallax stage already built:

| Plane | Content | Behaviour on scroll |
|---|---|---|
| 1 (back) | **the rotisserie video** | playhead scrubs 0 → 1 across the hero |
| 2 (mid) | the HOUSE ISSUE masthead | drifts up, passes over the case glass |
| 3 (front) | the sandwich cutout (unchanged) | rises, stays whole, stays clickable |

And the thing no other restaurant hero can do: **the live chicken counter
counts down with the scrub.** `ChickenCount` reads 60 at the top of the hero
and ticks down as the birds brown, landing on the real clock-driven number as
the hero resolves. The scroll plays the day forward from open to now, and then
hands off to live data. That reuses a component already on the page and costs
nothing.

## Assets to generate

| # | Asset | Model | Params | Credits |
|---|---|---|---|---|
| 1 | Hero start frame (3 passes budgeted) | `nano_banana_pro` | 2k, 16:9 | 6.0 |
| 2 | Hero video | `seedance1_5` | 4s, 720p, 16:9, silent, `start_image`=#1 | 4.8 |
| 3 | Section stills ×4 (one batch) | `nano_banana_2` | 1k, 3:2 | 6.0 |
| — | **Total** | | | **16.8** |

Naive equivalent (2k sections · 8s · 1080p · audio on · separate 9:16 render): **62.0**
Saving from the cost levers: **45.2**

Balance after: **1,183.2**

Cheaper alternate: `veo3_1_lite` at 4s is **4.0** instead of 4.8. I am
recommending `seedance1_5` anyway — 0.8 credits buys the more reliable
`start_image` + `end_image` pairing if the first take drifts off a single
continuous rotation.

## Prompts (exact text that will be sent)

**#1 — Hero start frame**
> A commercial rotisserie behind case glass in a Los Angeles neighborhood deli,
> a horizontal steel spit carrying five whole chickens, skin pale gold and
> freshly loaded, glowing red heating elements running above them, a brushed
> steel drip tray below catching the first drippings, dark near-black brushed
> steel surround, warm ember light on the birds as the dominant light source,
> shot on a full-frame camera with an 85mm lens at f/2.0, natural directional
> light from one side, deep shadow falloff, fine film grain, no text, no logo,
> no watermark, no people's faces, centered subject with generous negative
> space in the upper third for a headline

**#2 — Hero video motion**
> The steel spit rotates slowly and continuously, carrying the chickens through
> a single revolution; the skin deepens from pale gold to burnished mahogany,
> fat renders and begins to glisten, drippings fall steadily into the tray
> below; one continuous unbroken take, locked-off camera, single smooth
> transformation from first frame to last, no cuts, no camera whip, no shot
> changes, consistent lighting throughout, subject remains centered in frame,
> final frame settles and holds

**#3 — Section stills** (each carries the still suffix from #1)
> a. **Goods shelf** — a shelf of jarred goods beside a deli register, jars of
> chili oil and green sauce with plain kraft labels, a stack of folded canvas
> totes, a bag of whole-bean coffee, warm shop light from the left, dark wood
> shelf
>
> b. **Order bag** — a kraft paper takeaway bag folded and stapled shut on a
> scratched steel counter, a paper ticket stapled to the fold, a wrapped
> sandwich just visible at the top, warm overhead shop light
>
> c. **The cold case** — a deli cold case at eye level, stainless trays of
> marinated beans, cucumber salad, and olives with feta behind curved glass,
> cool case light from within, warm shop light above
>
> d. **The long table** — a long communal wooden table on a Los Angeles
> sidewalk outside a deli, mismatched chairs, paper-wrapped sandwiches and
> trays down its length, late afternoon sun, no people's faces

Each fills a real hole: (a) is the Goods page's only remaining placeholder,
(b) the order/pickup page has no imagery at all, (c) backs the "From the Case"
menu column, (d) backs Sunday Family Table on the Neighborhood Desk.

## Supplied by the client (no credits)

Storefront, sandwich cutout, four food cutouts, four drop-product cutouts,
paper stock, tape, polaroid frame, receipt, chicken engraving, steel case,
wood counter, desk polaroids. These remove every interior, product, and food
generation from the plan — roughly 12 stills that would otherwise be here.

## Not generating, and why

- **A vertical 9:16 hero** — one 16:9 master with the spit centered, cropped by
  CSS `object-fit: cover`. A second render is a second full charge.
- **1080p or 4k** — the hero sits under the masthead and a cutout sandwich and
  is re-encoded for scrubbing. 720p is indistinguishable and 2.5× cheaper.
- **8 seconds** — a scrubbed clip's perceived length comes from the scroll
  wrapper height, not the clip. 4s over 300vh is a slow, deliberate reveal.
- **Audio** — measured as free, but a muted hero should ship silent and smaller.
- **Interiors, staff, the room** — real photography, already in hand.

## Post-production (Phase 6, free)

Re-encode with every frame a keyframe (`-g 1 -keyint_min 1 -sc_threshold 0`),
or an unprepared MP4 scrubs in visible jumps. Extract a poster frame and a WebM
alternate. If iOS Safari refuses reliable `currentTime` scrubbing, fall back to
a ~72-frame JPEG sequence swapped on scroll — bulletproof, and also free.

---

**Approval required.** Reply "approved" to spend **16.8** credits, or tell me
what to change. Nothing is generated until then.
