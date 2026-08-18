# FEEDBACK — image slots

Wired and live. The filenames below are what the code reads; replacing a
file replaces what the page shows, with no code change. Any slot whose
file is missing renders a composed stand-in instead, so the page is never
broken while a shot is outstanding.

## In use

### Hero
- `hero-griddle-background.jpg` — the bare flat top. Also the ground the
  hero cuts back to when the cook resolves.
- `hero-burger-cutout.png` — the finished burger, isolated. This is the
  resolve, and the thing that becomes the order button.

### The five cook frames
Full-bleed stills of the same flat top. The knob scrubs between them and
each carries its own griddle, light and smoke, so the cook *is* the
stage rather than a cut-out floating over one.
- `process-01-raw-patty.jpg`
- `process-02-first-smash.jpg`
- `process-03-griddled-onions.jpg`
- `process-04-cheese-melt.jpg`
- `process-05-finished-burger.jpg`

### Section 02 — Crisp Edges. Heavy Feedback.
- `signal-burger-closeup.jpg` — the macro cross-section, pinned behind
  the torn sheet.

### Section 03 — the set list
All eight tracks are shot. The first three came with the upload; the
other five were generated against `menu-clean-channel.jpg` as the style
reference so the grade, the light and the counter all match.
- `menu-feedback-burger.jpg`
- `menu-clean-channel.jpg`
- `menu-distortion-fries.jpg`
- `menu-overdrive.jpg`
- `menu-soundcheck.jpg`
- `menu-loaded.jpg`
- `menu-vanilla-hum.jpg`
- `menu-black-noise.jpg`

### Section 04 — the pedal board
- `sauce-house.png` · `sauce-spicy.png` · `sauce-garlic.png`
- `texture-amp-grille.jpg` — the board's ground.

### Sections 05—07
- `now-playing-cassette-burger.jpg` — the release.
- `all-ages-crowd.jpg` — the room.
- `merch-tee.png` · `merch-cap.png`
- `texture-bone-paper.jpg` — stock for the menu card, the torn sheet and
  the loyalty pass.
- `texture-oxblood-paper.jpg` — stock for the last panel.
- `paper-receipt-blank.png` — thermal roll for the footer ticket.

### The hero's ripped bottom edge
- `tear-edge.png` — a photographed tear: charcoal stock torn across its
  full width, fiber flaring along the rip, transparent below. Generated
  (2 variants, best kept) and keyed by flood fill so the fiber survived.
  Laid over the hero → section 02 boundary.

### The Test Kitchen listing
- `card.jpg` · `hero.jpg` — shot from the running page at full pressure.
  Regenerate these whenever the hero changes.

## Still open

Nothing here blocks the page — each renders its stand-in.

- **`waveform-moving.webp` uploaded as 0 bytes** — the file is empty. No
  loss: every waveform on the site is drawn as SVG, which stays sharp at
  any width and lets the pedal board change the wave's *shape* rather
  than swap a video. Not needed unless you want it somewhere specific.
- **The three logo states are not wired.** `logo-feedback-01-clean.png`,
  `-02-signal.png` and `-03-overload.png` are set flush to their canvas
  on both sides, so the F loses its stem and the K its right leg at any
  size. The hero draws the mark as SVG instead — whole word, crisp at any
  width, responds to every pressure value rather than three of them, and
  is real text to a screen reader. Re-export with even 4% side bearing
  and swapping them in is a one-line change.
- **`paper-oxblood-panel.jpg`** is uploaded but unused; the tiling
  oxblood texture covers the same ground better.
- **Steam plate.** The hero's heat haze is CSS and the cook frames carry
  their own smoke, so this is optional. `steam.webp`, transparent, if you
  ever want it.

## Notes
- Dark, hot, high contrast. Near-black `#0B0908`, char `#241A14`,
  bone `#E8E1D3`, blood `#7E1416`, signal red `#E23B2E`, amber `#E8A33D`.
- Keep cut-out shadows *in* the alpha — the page adds its own beneath.
