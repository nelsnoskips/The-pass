# Asset Plan — FEEDBACK

**Category:** Smash burger counter / all-ages venue · **Mood:** near-black, one
hot light source, bone paper, deep red and signal red
**Date:** 2026-08-18 · **Higgsfield balance at planning time:** 1,187.6 credits (Plus)

> **Nothing here has been generated.** The site is built, deployed and
> presentable with `public/images/feedback/` empty — every slot draws its own
> stand-in. This is the plan for replacing those stand-ins with photography,
> and the credit cost of doing it. It needs an explicit go-ahead before a
> single credit is spent.

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

| # | Asset | Model | Params | Credits |
|---|---|---|---|---|
| 1 | Frame 5, the finished burger (3 passes budgeted) | `nano_banana_pro` | 2k, 3:2, transparent | 6.0 |
| 2 | Frames 1—4, one batch, frame 5 as the reference | `nano_banana_pro` | 2k, 3:2, transparent | 8.0 |
| 3 | Griddle plate + macro cross-section (one batch) | `nano_banana_2` | 2k, 3:2 | 3.0 |
| 4 | Steam loop, transparent | `seedance1_5` | 4s, 720p, silent | 4.8 |
| 5 | Menu stills ×8 (one batch) | `nano_banana_2` | 1k, 1:1 | 12.0 |
| 6 | Sauce bottles ×3 + merch ×2 (one batch, transparent) | `nano_banana_2` | 1k, 3:4 | 7.5 |
| 7 | Crowd, release cover, torn paper (one batch) | `nano_banana_2` | 2k, mixed | 4.5 |
| — | **Total** | | | **45.8** |

Naive equivalent (every shot at 2k, one request each, 8s 1080p steam,
no reference chaining on the cook frames): **121.0**
Saving from batching, the 1k tier on square menu stills, and generating
frame 5 first as the reference for frames 1—4: **75.2**

Balance after: **1,141.8**

### Why frame 5 first

The five cook frames only work if they are the *same burger* — a drifting
camera or a different bun between frames breaks the scrub instantly. Shooting
the finished burger first and passing it back as the reference for the other
four is what buys that consistency, and it is cheaper than four independent
2k generations that then have to be re-rolled until they match.

### Cheaper alternate

Dropping the steam loop entirely (the CSS plumes already read well against a
photographed griddle) takes the total to **41.0**. I would keep it: the heat
haze behind a cut-out burger is the single thing that stops the hero reading
as a sticker on a background.

## Where they go

`public/images/feedback/README.md` is the drop target and lists every filename,
what the shot is, and the palette. Uploading the files is the entire deployment
step — no code changes, because each slot swaps to the photograph the moment
the file exists at its path.
