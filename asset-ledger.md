# Asset Ledger

Check this before any future generation. An asset already paid for is free.

| Date | Client | Asset | Model | Params | Credits | File | Reusable? |
|---|---|---|---|---|---|---|---|
| 2026-08-18 | HOUSE ISSUE | hero start frame, pass 1 (rejected) | nano_banana_2 | 2k 16:9 | 2.0 | — | no — superseded |
| 2026-08-18 | HOUSE ISSUE | hero start frame, pass 2 (used) | nano_banana_2 | 2k 16:9 | 2.0 | video/house/rotisserie-poster.jpg | no — brand specific |
| 2026-08-18 | HOUSE ISSUE | rotisserie hero video | seedance1_5 | 4s 720p 16:9 silent, start_image | 4.8 | video/house/rotisserie-scrub.mp4 | no — brand specific |
| 2026-08-18 | HOUSE ISSUE | goods shelf | nano_banana_flash | 1k 3:2 | 0.9 | images/house/shelf-goods.jpg | no — brand specific |
| 2026-08-18 | HOUSE ISSUE | kraft order bag | nano_banana_flash | 1k 3:2 | 0.9 | images/house/order-bag.jpg | **yes** — generic deli takeaway |
| 2026-08-18 | HOUSE ISSUE | cold case, salads | nano_banana_flash | 1k 3:2 | 0.9 | images/house/case-salads.jpg | **yes** — generic deli case |
| 2026-08-18 | HOUSE ISSUE | sidewalk long table | nano_banana_flash | 1k 3:2 | 0.9 | images/house/long-table.jpg | **yes** — generic communal table |
| | | | | **Total** | **12.4** | | |

Planned 16.8, spent 12.4. The section batch resolved to `nano_banana_flash`
rather than `nano_banana_2` and came in at 0.9 each instead of the budgeted 1.5.

## Notes for the next run

The hero video's usable range was the **first 2.1 seconds**. Past that the
model reoriented the birds from horizontal on the spit to hanging vertically —
a composition change, which scrubs like a shot cut. Trimming was free and cost
nothing to fix; a re-roll would have been 4.8. If a fuller browning arc is ever
wanted, pin it with an `end_image` rather than trusting the prompt alone.

`nano_banana_*` put a daylight window on the left of the first hero attempt,
which is exactly where the masthead sits. "No windows, no daylight" in the
prompt fixed it on pass 2 — worth including from the start on any hero whose
overlay type lives on one side.
