# Orravan — version 3 (direction 2)

The second design direction for Orravan Mechanical, built the same way
v2 was: a standalone static-export Next app, hosted as a versioned mock
under `/orravan-v3` so the review tool can frame v1, v2 and v3 side by
side.

## Build

    MOCK_BASE=/orravan-v3 npm run build
    # then publish: cp -r out ../public/orravan-v3

## The asset library

`public/images` holds this direction's own 24 delivered assets — see the
README in that folder for the exact filenames. Each version keeps its own
library: sharing one meant this bundle carried 35MB of photography it
never referenced, which failed the deploy.

## What carries over from v2

The plumbing, not the layout: `lib/site.ts` (all copy — one incident,
6:42 AM to verified at 9:22), `lib/images.ts` (slot map + `asset()`),
and the primitives in `components/ui.tsx` (`Plate`, `Reveal`,
`useSectionProgress`, `ParallaxY`, `DeepSeam`), `components/live.tsx`
(`LivePlate` cinemagraphs with still fallback) and the page chrome.

The section components still hold v2's composition — they are the
starting baseline and get reshaped to the new design.

## House rules learned on v2

- Photo bands take **width-proportional heights** (`min-h-[max(460px,30vw)]`),
  never fixed pixels — fixed heights crop faces differently at every
  screen size.
- Anchor crops to the subject (`object-top`), not to tuned percentages.
- Verify at 2560, 1920, 1440, 1366, 1024, 768 and 390 before pushing:
  `npm run qa`
- Ship photographic art as JPEG. Multi-MB PNGs have failed the deploy.

## Matching a mock: measure, do not eyeball

Every fidelity round on this build lost time to estimating proportions
by eye. The reliable method, in order:

1. **Find the section bands.** Classify each row of the mock by its
   background colour at the far-left gutter (that column is always
   section background, never content). Contiguous runs are the bands.
2. **Find the rail.** For each heading band, the first ink pixel from
   the left gives the heading's x. In this reference it is 6.7% of page
   width on every single section — that number becomes a token, applied
   in one place, so the left column cannot drift.
3. **Find the photo frames.** A photographic row has real tonal spread;
   ivory and flat card rows do not. Take the row-wise standard
   deviation across the content column and threshold it — the
   contiguous runs are the image rectangles.
4. **Express everything as a share of page width**, not pixels. The
   mock is one fixed-width render; height ÷ page width is the invariant
   that survives at 1440 and 2560 alike. Fixed pixel heights are what
   caused faces to be cropped differently at every screen size.
5. **Render the candidates; do not infer them.** Automatic subject
   detection was wrong twice on this build — warm wood and skin tones
   both trip a skin mask, which put the team's heads through the top of
   the frame. Crop the asset at the target frame aspect across a range
   of `object-position` values, lay them out as a contact sheet, and
   look. It takes one script and settles the question.
6. **Check the frame can hold the subject at all.** The reference's
   industries band is a thin architectural strip; our plates for it are
   portraits, and no position saves a portrait in a 6:1 band. When
   every candidate crop is bad, the frame is wrong, not the position.
7. **Frame the subject, not the box.** For each photograph compare the
   source aspect to the displayed frame aspect: `visible = a_src /
   a_disp` is the fraction of source height that survives a cover crop.
   Locate the subject's head band with a skin mask, then solve for the
   `object-position` Y that puts the top of the heads roughly 18% into
   the visible window. Guessing this is what produced chins cut off at
   the frame edge.

`qa.mjs` then proves the result at 2560/1920/1440/1366/1024/768/390.
