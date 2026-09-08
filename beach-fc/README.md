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
