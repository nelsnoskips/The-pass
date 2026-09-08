# Beach FC match-day motion template

One reusable surf plate + one script. Each new match costs zero credits.

## Files

- `matchday_template.py` – the compositor (needs Python 3, numpy, Pillow, ffmpeg).
- `surf-plate-15s.mp4` – the animated background, rendered once with Kling v3.0 Pro
  from `background-surf.png` (about 22.5 credits). Reuse it for every match that
  keeps this background.
- `background-surf.png` – the still the plate was made from, with the gold ring
  inpainted out. The script locks the cream band from it and damps surf motion
  behind the lower text.
- `ring-sprite.png` – the gold ring as an anti-aliased RGBA sprite, composited
  over the plate on every frame so the thin line stays crisp. (Copying it out of
  the still pixel-by-pixel through a colour mask made it look jagged.)
- `overlay-2026-09-12-lafc.png` – the transparent type layer exported from the
  design tool for the LAFC So Cal match.
- `matchday-2026-09-12-lafc-15s.mp4` – the finished video.

## Next match

1. In the design tool, update opponent, date, time, venue. Export the type layer
   as a transparent PNG at 1080x1350 (same layout, same positions).
2. Run:

```
python3 matchday_template.py overlay-NEW.png surf-plate-15s.mp4 matchday-NEW-15s.mp4 \
    --still background-surf.png --ring ring-sprite.png --calm 900 990
```

That is the whole process. Roles are assigned by position, so as long as the
layout stays the same the timing works without edits.

## Motion timeline

| time (s)  | element                                   | move                          |
|-----------|-------------------------------------------|-------------------------------|
| 0.0–0.6   | crest + club line, league badge           | fade in                       |
| 0.5–1.2   | MATCH                                     | rises out of a clipping band  |
| 0.75–1.45 | DAY                                       | rises out of a clipping band  |
| 1.3–1.8   | HOME OPENER tag                           | wipes left to right           |
| 1.6–2.3   | big date                                  | rises out of a clipping band  |
| 1.9–2.7   | weekday / time / year                     | rise + fade, staggered        |
| 2.3–2.9   | gold rule                                 | draws left to right           |
| 2.6–3.5   | BEACH FC / vs / opponent                  | rise + fade, staggered        |
| 3.0–3.5   | venue footer                              | fade in                       |
| 7.0–8.0   | MATCH DAY                                 | one soft light glint          |
| to 15.0   | hold on the living surf                   |                               |

Edit the numbers in `state()` to retime anything.

## Swapping the background photo

Render a new plate once. If the still carries thin graphic lines (like the
ring), remove them from the still first and keep them as a separate RGBA
sprite for `--ring`; otherwise the video model warps them. Upload the clean
still to Higgsfield, generate a 15 s Kling v3.0 Pro clip with a "slow, restrained, receding surf" prompt, then pass
the new still as `--still`. Kling always runs a full wave cycle no matter how
the prompt is worded, which is why the `--calm` zone exists: it fades any
deviation from the still below the given rows so surf never washes behind the
lower text, while the last frame stays pixel-identical to the poster.
