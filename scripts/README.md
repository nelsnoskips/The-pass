# scripts

## og-card.py

Regenerates `public/images/og-card.jpg`, the 1200×630 card every platform
shows when a link to the site is shared.

```bash
python3 scripts/og-card.py
```

It composes the card rather than cropping a photograph, because the card
is seen at thumbnail size in a feed and a cropped room says nothing that
small — the wordmark and one line of proposition do. The brand faces are
vendored in `og-fonts/` (DM Serif Display, Instrument Serif italic, Inter
SemiBold) so the script runs without network access and the card cannot
drift from the site's typography.

Requires Pillow. Edit the script if the proposition line changes; the
card is a build artifact, not a hand-edited image.
