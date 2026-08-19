# Asset Plan — The Pass, main site hero

**Status:** waiting on Higgsfield. Costs below are measured from this
project's own ledger, not preflighted — re-run `get_cost` before spending.

## Concept — "The light comes up"

The site is named after the pass: the place where nothing reaches the
guest unfinished. The hero should show that happening rather than
describe it.

- **Opening frame** — the pass counter in the dark. Lamps cold, one
  finished plate resting on the steel, almost unreadable. The wordmark
  sits over this.
- **Transformation** — the heat lamps warm up. Brass light rises and
  spreads down the steel, the plate comes out of the dark, steam begins
  to lift through the beam. One direction, no return.
- **Resting frame** — the pass fully lit, the plate glowing, the counter
  reading end to end. This is what Act III's headline and CTAs sit on.

It obeys the scrub rules: one continuous take, one monotonic change
(light rising), both ends stable compositions, locked-off camera, no
people, subject centred for the mobile crop.

Two reasons this concept over any other: a light source rising is the
single easiest transformation for a model to hold without inventing a
cut, and it puts the hero in the same world as the Our Story photograph,
so the site's two dark images read as one shoot.

## Assets

| # | Asset | Model | Params | Credits |
|---|---|---|---|---|
| 1 | Hero start frame (3 passes budgeted) | `nano_banana_pro` | 2k, 16:9 | 6.0 |
| 2 | Hero film | `seedance1_5` | 4s, 720p, 16:9, silent, `start_image`=#1 | 2.4 |
| — | **Total** | | | **8.4** |

`seedance1_5` at 4s/720p is quoted at 4.8 by preflight but has charged
**2.4** both times this project has run it. Treat the quote as a ceiling.

## Prompts

**#1 — start frame**
> A restaurant pass counter before service, a long stainless steel
> counter beneath a row of copper heat lamps that are switched off and
> cold, one finished plate resting on the steel barely catching what
> little light there is, the room falling away into near darkness
> behind, no people anywhere in frame, empty of figures, shot on a
> full-frame camera with a 50mm lens at f/2.0, deep shadow falloff, fine
> film grain, no text, no logo, no watermark, no border or frame around
> the image, subject centred with generous dark space above the counter

**#2 — motion**
> The copper heat lamps warm and come up to full, their light rising
> slowly and spreading down the steel counter; the plate emerges from
> the dark and begins to glow, faint steam lifting through the beam. One
> continuous unbroken take, locked-off camera, a single smooth rise in
> light from first frame to last, no cuts, no camera whip, no shot
> changes, no change in composition or framing, subject remains centred
> in frame, final frame settles and holds.

Note the explicit "no border or frame around the image" on #1. The Our
Story still came back as a framed print with a 139px white edge baked
in; the prompt now forbids it.

## Build

The scroll machinery already exists. `components/house/RotisserieScrub.tsx`
does exactly this job — pin distance read from the DOM, damped loop,
frame-quantised seeking, poster frame under reduced motion. It would be
generalised out of the house concept and reused, not rewritten.

The marketing hero already pins for three acts, so the film's playhead
maps to the existing stage rather than needing a new one.

## Post

Every frame a keyframe, 1024–1100px wide, CRF 26–28, silent, poster
extracted. Measure the edges of the start frame before animating it.
