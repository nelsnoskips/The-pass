# Beach FC GAME DAY motion template (player-photo edition)

The player is never touched by AI. She is cut out once, composited back as the
original pixels, and everything around her moves.

## Layers (back to front)

1. `pitch-plate-15s.mp4` – Kling v3.0 Pro render of `pitch-still-empty.png`
   (the photo with both players removed by Higgsfield's image editor, blended
   back into the original so only the silhouettes are AI-filled). Palms sway,
   haze drifts, turf shimmers. Slow push-in 1.00 -> 1.045.
2. `teammate-sprite.png` – the blurred teammate, static, from the original photo,
   riding with the plate.
3. Gold wave lines, warped by a travelling sine so they ripple behind the player,
   drawing on left -> right in the first two seconds.
4. `player-cutout.png` – Higgsfield background-remover cutout, untouched pixels,
   push-in 1.00 -> 1.075 anchored at her feet (parallax depth).
5. Vignette / grunge from the overlay, static.
6. Type: header + badges fade in, GAME then DAY rise out of a clip band, the rule
   draws, the four footer lines rise in staggered. One soft glint crosses the
   headline at 6.5 s.
7. Fine animated film grain.

## Render

```
python3 gameday_template.py --overlay overlay-NEW.png --plate pitch-plate-15s.mp4 \
    --player player-cutout.png --teammate teammate-sprite.png --out gameday-NEW-15s.mp4
```

## Next match with a new photo

1. Upload the photo; run Higgsfield `remove_background` for the cutout and the
   image editor ("remove the players, keep everything else") for the empty plate.
   Blend the AI plate into the original only inside the dilated silhouettes.
2. One 15 s Kling render of the empty plate with a "gentle ambient, no people,
   no smoke" prompt (about 22.5 credits). Kling will animate any person left in
   the plate, so remove every person first and put them back as static sprites.
3. Export the type layer as a transparent PNG and run the command above.

## Note on this first overlay

The transparent overlay never confirmed in Higgsfield; the copy that arrived had
the checkerboard baked in. `overlay-2026-09-19-breakers.png` was recovered from
it: cream type by core-proximity alpha, gold lines by hue (R-B) with a closing
to bridge checker gaps, and a synthetic vignette matched to the flat poster.
A real transparent export is preferred for future matches.
