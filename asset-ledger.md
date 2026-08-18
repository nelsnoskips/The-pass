# Asset Ledger

Check this before any future generation. An asset already paid for is free.
Figures below are from the transaction log, not from preflight estimates —
the two do not always agree (see the note at the bottom).

| Date | Client | Asset | Model | Params | Credits | File | Reusable? |
|---|---|---|---|---|---|---|---|
| 2026-08-18 | HOUSE ISSUE | hero start frame, pass 1 — daylight window on the masthead side | nano_banana_pro | 2k 16:9 | 2.0 | — rejected | no |
| 2026-08-18 | HOUSE ISSUE | hero start frame, pass 2 — raw birds | nano_banana_pro | 2k 16:9 | 2.0 | — superseded | no |
| 2026-08-18 | HOUSE ISSUE | hero video take 1 — birds flipped vertical at 2.3s | seedance1_5 | 4s 720p 16:9 silent | 2.4 | — superseded | no |
| 2026-08-18 | HOUSE ISSUE | goods shelf | nano_banana_2 | 1k 3:2 | 1.5 | images/house/shelf-goods.jpg | no — brand specific |
| 2026-08-18 | HOUSE ISSUE | kraft order bag | nano_banana_2 | 1k 3:2 | 1.5 | images/house/order-bag.jpg | **yes** — generic deli takeaway |
| 2026-08-18 | HOUSE ISSUE | cold case, salads | nano_banana_2 | 1k 3:2 | 1.5 | images/house/case-salads.jpg | **yes** — generic deli case |
| 2026-08-18 | HOUSE ISSUE | sidewalk long table | nano_banana_2 | 1k 3:2 | 1.5 | images/house/long-table.jpg | **yes** — generic communal table |
| 2026-08-18 | HOUSE ISSUE | hero start frame, pass 3 — birds finishing (used) | nano_banana_pro | 2k 16:9 | 2.0 | video/house/rotisserie-poster.jpg | no — brand specific |
| 2026-08-18 | HOUSE ISSUE | hero video take 2 (used) | seedance1_5 | 4s 720p 16:9 silent, start_image | 2.4 | video/house/rotisserie-scrub.mp4 | no — brand specific |
| | | | | **Total** | **16.8** | | |

Balance 1200 → 1183.2. Planned 16.8, spent 16.8 — but not the way the plan
predicted; see below.

## Two corrections worth carrying forward

**Preflight over-quoted the video by 2×.** `get_cost` returned 4.8 for
`seedance1_5` at 4s/720p; the actual charge was **2.4**, both times. On this
plan the video line is half what the preflight says. The image preflights were
exact. Do not stop preflighting — but read a video quote as a ceiling.

**The section batch was 1.5 each, not 0.9.** An earlier version of this ledger
inferred per-asset costs from the balance delta and got the split wrong in both
directions. Attribute from the transaction log, never from arithmetic on the
balance.

## What the two failed generations taught

**A rotisserie is not a carousel.** Take 1 was asked to brown the birds from raw
to finished; at 2.3s the model reoriented them from horizontal on the spit to
hanging vertically, which is a composition change and scrubs like a shot cut.
Chickens skewered along a horizontal spit rotate *about* that axis and never
change orientation — the prompt now says so explicitly, in the negative.

**Give the model one job.** Take 2 dropped the colour arc entirely and starts
with the birds already finishing, so the only transformation left is rotation.
Less to invent, and it held composition for the full four seconds. It is also
the better shot: raw chickens are not appetite.

**Say "no windows, no daylight" on any hero with overlay type.** Pass 1 put a
bright window on the left, exactly where the masthead sits.

## Encoding

Hero is 1024×576, 24fps, CRF 28, **every frame a keyframe**
(`-g 1 -keyint_min 1 -sc_threshold 0`) so the browser can seek to any scroll
position without decoding forward. All-keyframe encoding costs roughly 4× the
bytes, which is why the resolution is modest — it sits behind a masthead and a
cutout sandwich. 1.4 MB. At 2× zoom it is indistinguishable from the 1100px
CRF 26 encode that was 38% larger.
