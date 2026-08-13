#!/usr/bin/env python3
"""
Generate the Rebellion brand texture set.

The identity is watercolour, ink and torn paper (blueprint §05: "warm paper,
deep ink, oxblood accents… collected over time, not generated from a
template"). CSS gradients read as airbrush, so the washes, splatters, painted
edges and paper fibre are produced here as real, irregular artwork.

Everything is written as an **alpha mask** — white RGB with the shape in the
alpha channel — so one file serves any brand colour through CSS `mask-image`
plus a background colour. That keeps the palette in tokens, keeps the files
small, and means a scanned replacement from the artist only has to match the
mask convention.

    python3 scripts/generate-artwork.py

Output: public/artwork/*.png and lib/artwork.ts (generated SVG paths).
Deterministic — a fixed seed per asset, so re-running produces identical files.
"""

from __future__ import annotations

import math
import pathlib

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ART = ROOT / "public" / "artwork"
ART.mkdir(parents=True, exist_ok=True)


# --- noise ------------------------------------------------------------------


def fractal_noise(h: int, w: int, rng: np.random.Generator, octaves: int = 6,
                  persistence: float = 0.55, base: int = 3) -> np.ndarray:
    """Sum of upsampled random octaves — cheap fBm, smooth enough for washes."""
    out = np.zeros((h, w), dtype=np.float64)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        res = base * 2**o
        grid = rng.random((min(res, h), min(res, w)))
        up = Image.fromarray((grid * 255).astype("uint8")).resize((w, h), Image.BICUBIC)
        out += amp * (np.asarray(up, dtype=np.float64) / 255.0)
        total += amp
        amp *= persistence
    return out / total


def periodic_noise(n: int, rng: np.random.Generator, harmonics: int = 260,
                   kmin: int = 6, kmax: int = 46) -> np.ndarray:
    """
    Seamlessly tileable noise: a sum of integer-frequency sinusoids.

    Frequencies are drawn on a ring rather than a square so the result has no
    preferred direction — otherwise the paper reads as brushed metal.
    """
    y, x = np.mgrid[0:n, 0:n] / n
    out = np.zeros((n, n), dtype=np.float64)
    for _ in range(harmonics):
        k = rng.integers(kmin, kmax)
        theta = rng.random() * 2 * math.pi
        kx = max(1, int(round(k * math.cos(theta))))
        ky = max(1, int(round(k * math.sin(theta))))
        out += (1.0 / k) * np.sin(2 * math.pi * (kx * x + ky * y)
                                  + rng.random() * 2 * math.pi)
    out -= out.min()
    return out / out.max()


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def save_mask(alpha: np.ndarray, name: str) -> None:
    """Write a white RGB image carrying `alpha` (0–1) in its alpha channel."""
    a = (np.clip(alpha, 0, 1) * 255).astype("uint8")
    rgb = np.full(a.shape + (3,), 255, dtype="uint8")
    img = Image.fromarray(np.dstack([rgb, a]), mode="RGBA")
    path = ART / name
    img.save(path, optimize=True)
    print(f"  {name:24s} {img.width}×{img.height}  {path.stat().st_size // 1024}KB")


# --- watercolour ------------------------------------------------------------


def bloom(size: int, seed: int, layers: int = 3) -> np.ndarray:
    """
    A watercolour bloom.

    Each layer is a radial field pushed around by fBm so the silhouette is
    irregular, then given the darker rim that pooling pigment leaves at the
    edge of a wash. Layers are stacked at partial strength the way overlapping
    washes build up, and the whole thing is granulated so flat areas still
    have tooth.
    """
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size] / (size - 1)
    acc = np.zeros((size, size), dtype=np.float64)

    for layer in range(layers):
        cx = 0.5 + (rng.random() - 0.5) * 0.16
        cy = 0.5 + (rng.random() - 0.5) * 0.16
        # Squash each layer slightly differently so the stack is never circular.
        sx = 1.0 + (rng.random() - 0.5) * 0.5
        sy = 1.0 + (rng.random() - 0.5) * 0.5
        r = np.sqrt(((xx - cx) * sx) ** 2 + ((yy - cy) * sy) ** 2) * 2.0

        # Two scales of displacement: the low octave gives the wash its overall
        # lopsided shape, the high one the fingers pigment makes as it creeps
        # along the paper.
        warp = fractal_noise(size, size, rng, octaves=6, persistence=0.58)
        tendril = fractal_noise(size, size, rng, octaves=6, persistence=0.66, base=9)
        r_eff = r + (warp - 0.5) * 0.78 + (tendril - 0.5) * 0.30

        body = smoothstep(0.94, 0.30, r_eff)
        # Pigment pools where the wash ends: a rim that peaks mid-falloff.
        rim = np.clip(body * (1.0 - body) * 4.0, 0, 1) ** 1.2
        acc += (body * 0.58 + rim * 0.66) * (0.85 if layer else 1.0)

    acc = np.clip(acc / max(1, layers) * 1.55, 0, 1)

    grain = fractal_noise(size, size, np.random.default_rng(seed + 991),
                          octaves=7, persistence=0.72, base=6)
    acc *= 0.72 + 0.28 * grain

    # Trim any pigment that reaches the tile edge so the wash never looks cropped.
    fade = (smoothstep(0.0, 0.09, xx) * smoothstep(1.0, 0.91, xx)
            * smoothstep(0.0, 0.09, yy) * smoothstep(1.0, 0.91, yy))
    return acc * fade


# --- ink --------------------------------------------------------------------


def splatter(size: int, seed: int, drops: int = 26, spread: float = 0.9,
             core: float = 0.2) -> np.ndarray:
    """
    An ink splatter: one irregular core, satellites thrown outward on a
    dominant axis, and fine spray. Ink is opaque, so edges stay hard.
    """
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size] / (size - 1)
    out = np.zeros((size, size), dtype=np.float64)

    def blot(cx: float, cy: float, radius: float, wobble: float, elong=(1.0, 1.0),
             detail: int = 5):
        r = np.sqrt(((xx - cx) * elong[0]) ** 2 + ((yy - cy) * elong[1]) ** 2)
        n = fractal_noise(size, size, rng, octaves=detail, persistence=0.68, base=6)
        edge = radius * (1.0 + (n - 0.5) * wobble)
        # A narrow falloff keeps ink opaque with a hard, ragged perimeter.
        return smoothstep(1.06, 0.94, r / np.maximum(edge, 1e-6))

    if core > 0:
        out = np.maximum(out, blot(0.5, 0.5, core, 0.9, detail=6))

    angle = rng.random() * 2 * math.pi
    for _ in range(drops):
        a = angle + rng.normal(0, 1.05)
        d = abs(rng.normal(0, spread * 0.28)) + core * 0.9
        cx, cy = 0.5 + math.cos(a) * d, 0.5 + math.sin(a) * d
        if not (0.02 < cx < 0.98 and 0.02 < cy < 0.98):
            continue
        # Satellites shrink with distance and stretch along their flight path.
        radius = max(0.003, rng.gamma(1.3, 0.014) * (1.0 - d * 0.55))
        stretch = 1.0 + rng.random() * 2.2
        elong = (1.0 / (1 + (stretch - 1) * abs(math.cos(a))),
                 1.0 / (1 + (stretch - 1) * abs(math.sin(a))))
        out = np.maximum(out, blot(cx, cy, radius, 0.85, elong))

    # Fine spray — the specks that sell a splatter as thrown rather than drawn.
    for _ in range(drops * 2):
        a = angle + rng.normal(0, 1.4)
        d = abs(rng.normal(0, spread * 0.36)) + core
        cx, cy = 0.5 + math.cos(a) * d, 0.5 + math.sin(a) * d
        if not (0.01 < cx < 0.99 and 0.01 < cy < 0.99):
            continue
        r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        out = np.maximum(out, smoothstep(1.0, 0.6, r / rng.uniform(0.0018, 0.006)))

    return np.clip(out, 0, 1)


# --- painted photo edge -----------------------------------------------------


def bleed_edge(w: int, h: int, seed: int, bite: float = 0.032) -> np.ndarray:
    """
    A brush-laid rectangle: solid in the middle, ragged at the perimeter, the
    way a photograph looks when it is printed onto a painted ground.
    """
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w]
    xn, yn = xx / (w - 1), yy / (h - 1)

    n = fractal_noise(h, w, rng, octaves=5, persistence=0.6, base=3)
    j = (n - 0.5) * bite * 2.2

    left = smoothstep(0.0, bite, xn + j)
    right = smoothstep(1.0, 1.0 - bite, xn + j)
    top = smoothstep(0.0, bite * (w / h) * 0.9, yn + j)
    bottom = smoothstep(1.0, 1.0 - bite * (w / h) * 0.9, yn + j)

    mask = left * right * top * bottom
    fine = fractal_noise(h, w, np.random.default_rng(seed + 7),
                         octaves=7, persistence=0.75, base=8)
    # Only the ragged border gets tooth; the middle stays fully opaque.
    return np.clip(mask * (0.9 + 0.1 * fine) + (mask > 0.985) * 1.0, 0, 1)


# --- generated SVG paths ----------------------------------------------------


def deckle_path(seed: int, segments: int = 26, height: float = 24.0,
                amp: float = 8.5) -> str:
    """Torn-paper edge, drawn across a 1200×`height` box (stretched by CSS)."""
    rng = np.random.default_rng(seed)
    noise = fractal_noise(1, segments + 1, rng, octaves=4, persistence=0.62, base=2)[0]
    ys = height - (noise * amp + (height - amp) * 0.32)
    pts = [(i * 1200 / segments, float(y)) for i, y in enumerate(ys)]

    d = [f"M0,{height} L0,{pts[0][1]:.1f}"]
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        mx = (x0 + x1) / 2
        d.append(f"Q{mx:.1f},{y0:.1f} {x1:.1f},{y1:.1f}")
    d.append(f"L1200,{height} Z")
    return " ".join(d)


def brush_path(seed: int, length: float = 200.0, thick: float = 7.0) -> str:
    """A tapered brush stroke with dry-brush thinning, on a 200×16 box."""
    rng = np.random.default_rng(seed)
    steps = 60
    ts = np.linspace(0, 1, steps)
    noise = fractal_noise(1, steps, rng, octaves=4, persistence=0.6, base=2)[0]

    # Loaded in the middle, dry at both ends.
    taper = np.sin(ts * math.pi) ** 0.55
    width = thick * taper * (0.55 + 0.65 * noise)
    centre = 8.0 + (noise - 0.5) * 2.6

    top = [(t * length, c - w / 2) for t, c, w in zip(ts, centre, width)]
    bot = [(t * length, c + w / 2) for t, c, w in zip(ts, centre, width)]

    d = [f"M{top[0][0]:.1f},{top[0][1]:.2f}"]
    d += [f"L{x:.1f},{y:.2f}" for x, y in top[1:]]
    d += [f"L{x:.1f},{y:.2f}" for x, y in reversed(bot)]
    d.append("Z")
    return " ".join(d)


# --- run --------------------------------------------------------------------


def main() -> None:
    print("watercolour washes")
    for name, seed in (("bloom-a", 20260813), ("bloom-b", 771), ("bloom-c", 5309)):
        save_mask(bloom(620, seed), f"{name}.png")

    print("ink")
    save_mask(splatter(560, 4471, drops=30, spread=1.0, core=0.19), "splatter-a.png")
    save_mask(splatter(560, 90210, drops=24, spread=0.85, core=0.13), "splatter-b.png")
    save_mask(splatter(560, 1312, drops=44, spread=1.15, core=0.0), "spray-a.png")

    print("painted photo edges")
    save_mask(bleed_edge(1000, 750, 8802), "bleed-landscape.png")
    save_mask(bleed_edge(750, 1000, 3391), "bleed-portrait.png")

    print("paper")
    # High frequencies only: paper wants tooth at the pixel scale, not blotches.
    fibre = periodic_noise(256, np.random.default_rng(64010),
                           harmonics=420, kmin=34, kmax=124)
    fibre = np.clip((fibre - 0.5) * 2.6 + 0.5, 0, 1) ** 2.4
    save_mask(fibre * 0.5, "paper-fibre.png")

    ts = ROOT / "lib" / "artwork.ts"
    ts.write_text(
        "/**\n"
        " * Generated artwork paths — do not hand-edit.\n"
        " * Produced by scripts/generate-artwork.py (deterministic; re-runnable).\n"
        " *\n"
        " * Torn-paper edges are drawn on a 1200×24 box and the brush strokes on a\n"
        " * 200×16 box; both are stretched by the components that use them.\n"
        " */\n\n"
        "export const DECKLE_PATHS = [\n"
        + "".join(f'  "{deckle_path(s)}",\n' for s in (11, 47, 93))
        + "] as const;\n\n"
        "export const BRUSH_PATHS = [\n"
        + "".join(f'  "{brush_path(s)}",\n' for s in (5, 61, 137))
        + "] as const;\n",
        encoding="utf-8",
    )
    print(f"  lib/artwork.ts          {ts.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
