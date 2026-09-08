# Beach FC ECNL G2012/13 — animated 2026 Fall Season posters

Motion versions of the static schedule and roster posters. Logos, names,
numbers and every line of text are the original poster pixels; only the
photographic backgrounds move.

| File | Motion |
| --- | --- |
| `beach-fc-schedule-motion.mp4` | Sea fog drifts under the pier, a slow wave rolls in. |
| `beach-fc-roster-motion.mp4` | Golden light sweeps along the pyramid edge, palms sway. |

Both: 1080x1350 (4:5), 5 s, 24 fps, H.264, silent.

## How they were made

1. Each poster was run through Higgsfield (Kling v3.0 Pro, image-to-video,
   locked camera) to animate the background.
2. Raw AI output was not shipped: the models drift text glyphs. `composite.py`
   overlays the original poster's graphic layer on top of the AI motion with a
   feathered mask (schedule: everything above the fog line; roster: header
   band plus a tight per-glyph luminance mask), so the typography is
   pixel-identical to the source PNG in every frame.

## 15-second versions

`beach-fc-schedule-motion-15s.mp4` and `beach-fc-roster-motion-15s.mp4` were made
the same way from 15 s Kling v3.0 Pro renders (about 22.5 credits each), using
`composite15.py schedule` / `composite15.py roster`. The prompt asked for
steady-state, non-escalating motion so the pier and pyramid hold their shape
for the full clip. The raw Kling output rewrote several dates by second 10;
the composite replaces the entire graphic layer with the original PNG in every
frame, so the delivered files are text-exact.

## v2 posters (ECNL badge)

`beach-fc-schedule-motion-15s-v2.mp4` and `beach-fc-roster-motion-15s-v2.mp4`
use the updated posters that add the ECNL badge top-right. The photo regions
were pixel-identical to the first posters, so the schedule reuses the existing
15 s pier footage with the new graphic layer (no credits spent). The roster is a
new 15 s Kling v3.0 Pro render with a bolder brief: the edge light blooms wide
and rolls along the pyramid, lighting the faces and the low wall. Built with
`composite15_v2.py schedule` / `composite15_v2.py roster`. The text mask now
classifies by color (cream, light-gray, gold) instead of luminance so the
original glow edge is no longer frozen inside the animated glow.
