"""Beach FC GAME DAY motion template (player-photo edition).

Usage:
  python3 gameday_template.py --overlay OVERLAY.png --plate PLATE.mp4 --player CUTOUT.png \
      [--teammate TEAMMATE.png] --out OUT.mp4 [--seconds 15]

Layers, back to front:
  1. plate    : AI-animated background (player removed), slow push-in 1.00 -> 1.045
  2. player   : untouched RGBA cutout of the player, push-in 1.00 -> 1.075 anchored at
                her feet (more than the plate = parallax depth). Never re-rendered.
  3. waves    : the gold line cluster from the overlay, warped by a travelling sine so
                the lines ripple continuously behind the player; draws on at the start
  4. atmos    : every semi-transparent pixel of the overlay (vignette / grunge) - static
  5. type     : opaque overlay sprites (badges, headline, footer) animated in rigidly
  6. grain    : fine animated film grain, 3.5 % opacity
The final frame equals the still poster (plate still + player + overlay).
"""
import sys, subprocess, numpy as np
from PIL import Image, ImageFilter

FF = __import__('shutil').which('ffmpeg') or '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
FPS = 24

def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default

def ease_out_cubic(t): return 1 - (1 - t) ** 3
def ease_in_out(t): return t * t * (3 - 2 * t)
def clamp01(x): return max(0.0, min(1.0, x))
def prog(t, t0, t1): return clamp01((t - t0) / (t1 - t0))

# ---------------------------------------------------------------- overlay decomposition
def split_bands(mask, axis, gap):
    proj = np.where(mask.any(axis=1 - axis))[0]
    if len(proj) == 0: return []
    runs = []; s = p = proj[0]
    for i in proj[1:]:
        if i > p + gap: runs.append((s, p)); s = i
        p = i
    runs.append((s, p)); return runs

def decompose(ov):
    """ov: HxWx4 float. Returns (atmos RGBA, waves RGBA, sprites list)."""
    H, W = ov.shape[:2]
    a = ov[..., 3]
    R, G, B = ov[..., 0], ov[..., 1], ov[..., 2]
    solid = a > 200
    goldish = (R - B > 60) & (R > 150)
    # wave cluster: gold pixels in the middle band, wide and thin -> classify rows
    gold_rows = goldish & solid
    rows = split_bands(gold_rows, 0, 12)
    waves_box = None
    for y0, y1 in rows:
        cols = np.where(gold_rows[y0:y1 + 1].any(axis=0))[0]
        if (y1 - y0) > 0.08 * H and (cols.max() - cols.min()) > 0.8 * W:
            waves_box = (y0, y1 + 1); break
    waves = np.zeros_like(ov)
    if waves_box:
        y0, y1 = waves_box
        wm = goldish[y0:y1] & (a[y0:y1] > 40)
        wm = np.asarray(Image.fromarray((wm * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), dtype=np.float32) / 255
        waves[y0:y1] = ov[y0:y1] * wm[..., None]
        waves[y0:y1, :, 3] = ov[y0:y1, :, 3] * wm
    # sprites: solid pixels outside the wave box
    sm = solid.copy()
    if waves_box: sm[waves_box[0]:waves_box[1]] &= ~(goldish[waves_box[0]:waves_box[1]])
    sprites = []
    for y0, y1 in split_bands(sm, 0, 8):
        sub = sm[y0:y1 + 1]
        for x0, x1 in split_bands(sub, 1, 30):
            sprites.append(dict(y0=y0, y1=y1 + 1, x0=x0, x1=x1 + 1))
    # atmosphere: everything with alpha but not solid and not waves
    atmos = ov.copy()
    keep = (~solid).astype(np.float32)
    if waves_box: keep[waves_box[0]:waves_box[1]] *= (waves[waves_box[0]:waves_box[1], :, 3] <= 0)
    atmos[..., 3] *= keep
    # sprites take their pixels (incl. anti-aliased edge) from the full overlay
    for s in sprites:
        s['rgb'] = ov[s['y0']:s['y1'], s['x0']:s['x1'], :3]
        s['a'] = ov[s['y0']:s['y1'], s['x0']:s['x1'], 3] / 255.0
        # remove the soft atmosphere contribution from the sprite alpha (it stays in atmos)
        s['a'] = np.where(s['a'] > 0.78, s['a'], 0)
    return atmos, waves, name_sprites(sprites, W, H)

def name_sprites(sprites, W, H):
    sprites.sort(key=lambda s: (s['y0'], s['x0']))
    for s in sprites:
        cy = (s['y0'] + s['y1']) / 2; cx = (s['x0'] + s['x1']) / 2; h = s['y1'] - s['y0']; w = s['x1'] - s['x0']
        if cy < 0.10 * H:
            s['role'] = 'badge_left' if cx < 0.25 * W else ('badge_right' if cx > 0.75 * W else 'header')
        elif cy < 0.32 * H and h > 0.08 * H: s['role'] = 'headline'
        elif h <= 6 and w > 0.5 * W: s['role'] = 'rule'
        elif cy > 0.8 * H: s['role'] = 'footer'
        else: s['role'] = 'other'
    counts = {}
    for s in sprites:
        s['k'] = counts.get(s['role'], 0); counts[s['role']] = s['k'] + 1
    return sprites

# ---------------------------------------------------------------- animation
def state(s, t):
    """(dy, opacity, wipe) for a sprite at time t."""
    r, k = s['role'], s['k']
    if r in ('badge_left', 'badge_right', 'header'):
        return 0, ease_out_cubic(prog(t, 0.15, 0.75)), 1
    if r == 'headline':                      # GAME, DAY rise out of a clip band
        p = prog(t, 0.45 + 0.2 * k, 1.35 + 0.2 * k)
        return int(round((1 - ease_out_cubic(p)) * 120)), min(1, p * 2.2), 1
    if r == 'rule':
        return 0, 1 if t > 1.9 else 0, ease_out_cubic(prog(t, 1.9, 2.6))
    if r == 'footer':
        p = prog(t, 2.2 + 0.14 * k, 2.9 + 0.14 * k)
        return int(round((1 - ease_out_cubic(p)) * 34)), p, 1
    return 0, prog(t, 2.0, 2.6), 1

def glint_gain(t, s, xs):
    if s['role'] != 'headline': return None
    p = prog(t, 6.5, 7.6)
    if p <= 0 or p >= 1: return None
    x = s['x0'] - 250 + p * (s['x1'] - s['x0'] + 500)
    return 1.0 + 0.40 * np.exp(-((xs - x) / 80.0) ** 2)

def warp_waves(waves, t, W):
    """Travelling sine ripple: per-column vertical shift, plus draw-on wipe at the start."""
    amp = 7.0 * ease_out_cubic(prog(t, 0.8, 2.2))          # ripple grows in
    xs = np.arange(W, dtype=np.float32)
    shift = amp * np.sin(2 * np.pi * (xs / 520.0 - t * 0.28)) + 3.0 * np.sin(2 * np.pi * (xs / 190.0 + t * 0.17))
    out = np.zeros_like(waves)
    H = waves.shape[0]
    ys = np.arange(H, dtype=np.float32)
    # bilinear vertical resample per column
    src = ys[:, None] - shift[None, :]                       # H x W source rows
    y0 = np.floor(src).astype(int); f = (src - y0)[..., None]
    y1 = y0 + 1
    ok = (y0 >= 0) & (y1 < H)
    y0c = np.clip(y0, 0, H - 1); y1c = np.clip(y1, 0, H - 1)
    cols = np.arange(W)[None, :].repeat(H, 0)
    out = waves[y0c, cols] * (1 - f) + waves[y1c, cols] * f
    out[~ok] = 0
    wipe = ease_out_cubic(prog(t, 0.6, 1.9))
    edge = W * wipe
    fade = np.clip((edge - xs) / 120.0, 0, 1)                # soft leading edge
    out[..., 3] *= fade[None, :]
    return out

def push(img, s, cx, cy, W, H):
    """Scale img by s about (cx, cy) and return a WxH crop (PIL bilinear)."""
    if abs(s - 1) < 1e-4: return img
    pil = Image.fromarray(img.clip(0, 255).astype(np.uint8))
    nw, nh = int(round(W * s)), int(round(H * s))
    big = pil.resize((nw, nh), Image.BILINEAR)
    ox = int(round(cx * s - cx)); oy = int(round(cy * s - cy))
    return np.asarray(big.crop((ox, oy, ox + W, oy + H)), dtype=np.float32)

def main():
    ov = np.asarray(Image.open(arg('--overlay')).convert('RGBA'), dtype=np.float32)
    H, W = ov.shape[:2]
    player = np.asarray(Image.open(arg('--player')).convert('RGBA').resize((W, H), Image.LANCZOS), dtype=np.float32)
    teammate = None
    if arg('--teammate'):
        teammate = np.asarray(Image.open(arg('--teammate')).convert('RGBA').resize((W, H), Image.LANCZOS), dtype=np.float32)
    seconds = float(arg('--seconds', 15))
    atmos, waves, sprites = decompose(ov)
    for s in sprites: print(f"{s['role']:12s} k={s['k']} x {s['x0']}-{s['x1']} y {s['y0']}-{s['y1']}")
    # player anchor: bottom-centre of her opaque bbox (feet)
    ys, xs = np.where(player[..., 3] > 128); feet = (float(xs.mean()), float(ys.max()))
    rng = np.random.default_rng(7)
    n = int(round(seconds * FPS))
    dec = subprocess.Popen([FF, '-v', 'error', '-stream_loop', '-1', '-i', arg('--plate'),
                            '-vf', f'scale={W}:{H}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    enc = subprocess.Popen([FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'film', '-pix_fmt', 'yuv420p',
                            '-movflags', '+faststart', arg('--out')], stdin=subprocess.PIPE)
    for f in range(n):
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3: break
        t = f / FPS; u = t / seconds
        frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
        # 1. plate push-in about frame centre
        frame = push(frame, 1.0 + 0.045 * ease_in_out(u), W / 2, H * 0.55, W, H)
        if teammate is not None:                      # static teammate rides with the plate
            tm = push(teammate, 1.0 + 0.045 * ease_in_out(u), W / 2, H * 0.55, W, H); ta = tm[..., 3:4] / 255.0
            frame = frame * (1 - ta) + tm[..., :3] * ta
        # 2. waves ripple behind the player
        wv = warp_waves(waves, t, W); wa = wv[..., 3:4] / 255.0
        frame = frame * (1 - wa) + wv[..., :3] * wa
        # 3. player, slightly stronger push about her feet (untouched pixels)
        pl = push(player, 1.0 + 0.075 * ease_in_out(u), feet[0], feet[1], W, H)
        pa = pl[..., 3:4] / 255.0
        frame = frame * (1 - pa) + pl[..., :3] * pa
        # 4. atmosphere (vignette / grunge) - static, over everything like the design
        aa = atmos[..., 3:4] / 255.0
        frame = frame * (1 - aa) + atmos[..., :3] * aa
        # 5. type sprites
        for s in sprites:
            dy, op, wipe = state(s, t)
            if op <= 0: continue
            y0, y1, x0, x1 = s['y0'], s['y1'], s['x0'], s['x1']; h = y1 - y0
            src_bot = h - dy if dy > 0 else h
            if src_bot <= 0: continue
            rgb = s['rgb'][:src_bot]; a = s['a'][:src_bot] * op
            if wipe < 1:
                wx = int(round((x1 - x0) * wipe));
                if wx <= 0: continue
                rgb = rgb[:, :wx]; a = a[:, :wx]
            dx1 = x0 + rgb.shape[1]
            g = glint_gain(t, s, np.arange(x0, dx1, dtype=np.float32))
            if g is not None: rgb = np.clip(rgb * g[None, :, None], 0, 255)
            region = frame[y0 + dy:y0 + dy + rgb.shape[0], x0:dx1]
            frame[y0 + dy:y0 + dy + rgb.shape[0], x0:dx1] = region * (1 - a[..., None]) + rgb * a[..., None]
        # 6. grain
        grain = rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
        grain = np.repeat(np.repeat(grain, 2, 0), 2, 1)[:H, :W]
        frame = frame + grain[..., None] * 9.0 * 0.35
        enc.stdin.write(frame.clip(0, 255).astype(np.uint8).tobytes())
    enc.stdin.close(); enc.wait(); dec.terminate()
    print('wrote', arg('--out'), n, 'frames')

if __name__ == '__main__':
    main()
