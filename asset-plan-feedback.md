# Asset Plan — FEEDBACK

**Category:** Smash burger counter / all-ages venue · **Mood:** near-black, one
hot light source, bone paper, deep red and signal red
**Date:** 2026-08-18 · **Higgsfield balance at planning time:** 1,187.6 credits (Plus)

> **Status: the shoot landed, and one line of this plan was actually run.**
>
> Everything except the set list arrived as an upload. The five missing menu
> stills were generated on 2026-08-18 against `menu-clean-channel.jpg` as the
> style reference, and cost **11.9 credits** — not the 7.5 quoted. The quote
> came from a preflight of `nano_banana_2` at 1k with no reference image;
> attaching one raises the price to about 2.4 a frame. Worth knowing before
> the next batch: reference-driven generation is roughly 60% more than
> text-only at the same model and resolution.
>
> Balance 1,187.6 → **1,175.7**.
>
> **2026-08-18, second run:** the hero's ripped bottom edge
> (`tear-edge.png`) — two 21:9 2k variants plus one `remove_background`
> pass, **5.0 credits**. The remover left white debris under the fiber,
> so the shipped alpha was cut locally by flood-filling the contiguous
> white background from the frame edge, which preserves the fiber the
> matting model ate. Balance → **1,170.7**.

## The hero concept — "the guest cooks it"

The hero is not a photograph of a burger and not a video of one being made.
It is a burger being made, at the speed the visitor turns the knob: pressure
0 → 10 scrubs five locked-off frames, and the ingredients drop in on separate
tracks between them.

That mechanic is already built and working against drawn frames. What the
shoot has to deliver is five stills of **the same setup** — same camera, same
distance, same light, only the burger changing — cut out on transparent
grounds so they can be scrubbed without the background moving.

| Frame | What it is |
|---|---|
| 1 | A ball of chuck sitting on the flat top, untouched |
| 2 | Pressed thin, edges beginning to catch |
| 3 | Griddled onion pressed down into the crust |
| 4 | Double American over the edge, mid-melt |
| 5 | Finished: bun on, pickles showing — doubles as the hero product shot |

Because they are cut out, the griddle behind them is a separate plate and the
steam is a separate looping layer. That is what lets the page light the burger
hotter as pressure rises without re-rendering anything.

## What is *not* being generated

- **Sound.** The griddle sizzle, the amp hum, the pedal clicks and the feedback
  swell are synthesised in the Web Audio API at runtime. No files, no licensing,
  no download cost. Already built.
- **The map.** Drawn as a blueprint in SVG rather than embedded as a map tile:
  no third-party script, no consent banner, no layout shift.
- **The waveforms, the knob, the gauge, the cassette, the receipt.** All SVG.
- **The Test Kitchen card and case-page hero.** Shot from the running site into
  `card.jpg` / `hero.jpg`, so the concept is linkable from the homepage today.
  Replace them with photography from the same frames once the shoot lands.

## Assets to generate

Model IDs and credit costs below are **preflighted against the live catalogue**
(2026-08-18), not estimated. Two things came back different from the first pass
at this plan, and both change the shape of it:

- **No image model returns transparency.** Every cut-out needs a separate
  `remove_background` pass afterwards — the five cook frames, three bottles,
  two merch shots and the torn paper. Twelve passes. That tool takes no cost
  preflight, so it is the one unpriced line here.
- **Video is the expensive part, by a lot.** A 5s silent 720p clip is 17.5
  credits on `seedance_2_0` and 7.5 on `kling3_0` — not the ~5 the earlier
  draft assumed. Everything else is 1.5—2.0 credits a frame.

| # | Asset | Model | Params | Credits |
|---|---|---|---|---|
| 1 | Frame 5, the finished burger — 3 variants to pick from | `nano_banana_pro` | 2k, 3:2 | 6.0 |
| 2 | Frames 1—4, each with frame 5 passed back as the reference | `nano_banana_pro` | 2k, 3:2 | 8.0 |
| 3 | `griddle.jpg` + `anatomy-cross-section.jpg` | `nano_banana_2` | 2k, 3:2 | 4.0 |
| 4 | Menu stills ×8 | `nano_banana_2` | 1k, 1:1 | 12.0 |
| 5 | Sauce bottles ×3 + merch ×2 | `nano_banana_2` | 1k, 3:4 | 7.5 |
| 6 | `crowd.jpg` (2k) + release cover + torn paper (1k) | `nano_banana_2` | mixed | 5.0 |
| 7 | Cut-outs ×12 | `remove_background` | — | not priced |
| — | **Images subtotal** | | | **42.5** |
| 8 | Steam loop, 5s silent — optional | `kling3_0` | 5s, std, sound off | 7.5 |
| — | **Total with steam** | | | **50.0** |

Balance at planning time: **1,187.6**. After: **~1,137** plus whatever the
twelve background passes come to.

### Why frame 5 first

The five cook frames only work if they are the *same burger* — a drifting
camera or a different bun between frames breaks the scrub instantly. Shooting
the finished burger first and passing it back as the reference for the other
four is what buys that consistency, and it is cheaper than four independent
2k generations that then have to be re-rolled until they match.

### The cheap version

Skip the steam (**42.5**). The CSS heat plumes already read well and will read
better still against a photographed griddle; 7.5 credits is a poor trade for a
layer most visitors will not consciously see. If you want it later it can be
added on its own without touching anything else.

### The one to spend more on, not less

Frame 5 is the hero product shot, the last frame of the scrub, and the source
of the Test Kitchen card. If any line here deserves extra passes it is that one
— at 2 credits a variant, six passes instead of three costs 6 more credits and
is the cheapest quality decision available.

### Beyond the site

Higgsfield can also produce things this build does not need but a launch would:
a vertical promo cut for TikTok/Reels, or product-ad frames via
`marketing_studio_image`. Both are out of scope for the room itself and are
priced separately if they are ever wanted.

## Where they go

`public/images/feedback/README.md` is the drop target and lists every filename,
what the shot is, and the palette. Uploading the files is the entire deployment
step — no code changes, because each slot swaps to the photograph the moment
the file exists at its path.
