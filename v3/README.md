# Orravan — version 3 (direction 2)

The second design direction for Orravan Mechanical, built the same way
v2 was: a standalone static-export Next app, hosted as a versioned mock
under `/orravan-v3` so the review tool can frame v1, v2 and v3 side by
side.

## Build

    MOCK_BASE=/orravan-v3 npm run build
    # then publish: cp -r out ../public/orravan-v3

## The client library

`public/images` is a symlink to `../../v2/public/images` — one copy of
the photography, wordmark and cinemagraphs, shared by every version.
The static export follows it, so the hosted bundle is complete. Add new
artwork to `v2/public/images` and both versions see it.

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
