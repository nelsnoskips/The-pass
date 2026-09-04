# BLUE at the Gale — Homepage Build Brief

## Creative direction

Build the selected dark luxury direction shown in `blue-at-the-gale-combined-homepage-mock.png`.

Central idea: **The room doesn’t start blue. It becomes Blue.**

The experience begins in near-black candlelight. Cobalt gradually enters the page as the guest moves from anticipation, to dinner, to the performance, and finally to after-hours. Motion should feel like stage direction—not technology layered on top of hospitality.

## Navigation

- Logo: BLUE / AT THE GALE SOUTH BEACH
- Links: Tonight, The Experience, Calendar, Membership, Private Events
- Primary action: Reserve
- Transparent over the hero; becomes a 90% opaque blue-black bar after the hero
- Desktop height: 84px
- Mobile: logo, Reserve, menu trigger

## Hero

Use the open-curtain image as layered visual inspiration. For production, separate the scene into foreground tables, left curtain, right curtain, microphone, rear scrim, and haze when assets permit.

Copy:

> THE ROOM  
> IS WAITING.

> Dinner, live music and the night that follows—beneath the Gale South Beach.

Buttons: `VIEW TONIGHT` and `RESERVE THE EXPERIENCE`

Eyebrow: `BENEATH THE GALE · 1690 COLLINS AVENUE`

### Hero scroll sequence

1. Start nearly black with only candlelight and a narrow blue pool behind the microphone.
2. Open both curtains from approximately 28% occlusion to fully open over the first 35% of the scroll.
3. Scale the faint BLUE projection from 1.08 to 0.94 while fading opacity from 0.42 to 0.
4. Move the rear scrim at `0.06 × scroll`, microphone at `0.12 × scroll`, and foreground tables at `0.20 × scroll`.
5. Increase cobalt saturation and haze slightly before transitioning into the weekly calendar.
6. Do not animate the microphone itself. It is the visual anchor.

Pin the hero for approximately 140vh on desktop. Use a simple 85vh non-pinned reveal on mobile.

## Homepage order

1. Open-curtain hero
2. This Week at Blue
3. One Seating. One Show. One Complete Evening.
4. Come for Dinner. Stay for the Turn.
5. Behind the Bar
6. A Room Few People Know
7. Private, Completely
8. The Room
9. Beneath the Gale. Beyond the Expected.
10. The First Note Is at 9
11. Footer

## Signature interactions

### Performance calendar

- Three portrait panels reveal from behind vertical velvet masks.
- Mask movement: 18–24px with a 0.9s cubic-bezier transition.
- On hover, image scales only to 1.025; artist information moves upward 6px.
- Keep dates and set times in real HTML text.

### Dinner-to-after-hours transition

- Use one matched room photographed in warm and blue lighting.
- Pin the section for 160vh on desktop.
- A vertical light wipe reveals the blue state from left to right.
- Warm state color temperature: approximately 2700K.
- Blue state: deep cobalt with warm skin tones preserved.
- Never use a draggable comparison slider.

### Section transitions

- Use occasional narrow vertical light seams, not a continuous line through the site.
- Blue reflections can move 8–16px independently from the associated image.
- Headlines reveal by line using overflow-hidden masks.
- Avoid scroll-jacking; all progress must remain tied directly to the browser scroll.

### Final CTA

- This is the most saturated blue moment.
- Fade the background from midnight navy to cobalt over the final 40% of its viewport entrance.
- Allow a faint performance silhouette to appear behind the copy.

## Brand system

```css
:root {
  --blue-black: #030812;
  --midnight: #071427;
  --cobalt: #0647D9;
  --stage-blue: #1167FF;
  --ivory: #F1EDE4;
  --muted-ivory: #BEBAB2;
  --champagne: #C7A66A;
  --hairline: rgba(241, 237, 228, 0.18);
}
```

Use cobalt for lighting and transformation. Use champagne only for small rules, one primary button, and selected details. Do not turn the site into a blue-and-gold theme.

## Typography

Recommended production pairing:

- Display: **Bodoni Moda**, weights 400 and 500
- Interface/body: **Manrope**, weights 400, 500 and 600

```css
@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500&family=Manrope:wght@400;500;600&display=swap');

:root {
  --font-display: "Bodoni Moda", serif;
  --font-ui: "Manrope", sans-serif;
}
```

- Hero display: `clamp(4rem, 7.2vw, 8.75rem)`, line-height `.88`
- Section display: `clamp(2.8rem, 5vw, 6.25rem)`, line-height `.92`
- Body: `clamp(1rem, 1.15vw, 1.2rem)`, line-height `1.6`
- Labels: 11–13px, uppercase, letter-spacing `.16em`

## Layout

- Maximum content width: 1540px
- Desktop side padding: `clamp(32px, 5vw, 88px)`
- Editorial grid: 12 columns, 24px gutters
- Section spacing: `clamp(96px, 12vw, 190px)`
- Corners: 0–2px only
- Borders: 1px hairlines
- Avoid centered copy in most sections; use asymmetry and strong image/copy tension

## Motion implementation

Use GSAP with ScrollTrigger or an equivalent scroll-linked animation library. Use Lenis only for subtle smoothing; do not create delayed, heavy scrolling.

- Transform only `opacity`, `transform`, `clip-path`, and CSS custom properties where possible.
- Use `will-change` only during active animations.
- Load the hero eagerly; lazy-load below-fold images.
- Provide AVIF and WebP sources.
- Respect `prefers-reduced-motion`: remove pinning and parallax, preserve simple fades under 300ms.
- Keep text, buttons, schedules, menus, and accessibility labels out of raster imagery.

## Responsive behavior

- At 900px and below, remove all section pinning except a short hero hold.
- Convert the weekly performances into a horizontal snap carousel.
- Stack editorial sections as copy then image.
- Replace the curtain parallax with a simple clip-path opening.
- Keep both hero actions visible without scrolling on common mobile heights.
- Minimum tap target: 44px.

## Avoid

- Generic nightclub visuals or DJs
- Neon signage and cyberpunk effects
- Glassmorphism or floating interface cards
- Constant blue glow on every element
- Continuous line graphics through the page
- Gold-dominant luxury styling
- Random Miami skyline, beach, or palm-tree imagery
- Text baked into photographs
- Excessive animation competing with reservations

## Build priority

1. Establish typography, spacing, and static responsive layout.
2. Implement the hero curtain and projection sequence.
3. Build the matched dinner-to-blue transition.
4. Add portrait masks and restrained image parallax.
5. Finish reduced-motion and performance QA.

The final experience should feel quiet before it feels dramatic. Blue earns its intensity as the evening unfolds.
