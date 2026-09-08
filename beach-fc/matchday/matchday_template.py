"""Beach FC match-day motion template.

Usage:  python3 matchday_template.py OVERLAY.png PLATE.mp4 OUT.mp4 [--seconds 15] [--still BG.png]

--still : the background still the plate was rendered from.  Flat design regions
          in it (the cream band, the gold ring) are locked from the still so the
          AI plate can only move the photograph.
--ring RING.png : an RGBA sprite (e.g. the gold ring) composited over the plate
          on every frame, under the type.  Keeps thin graphic lines crisp instead
          of copying them pixel-by-pixel out of the still.
--calm Y0 Y1 : below Y0 the plate's deviation from the still is faded out
          (fully by Y1) so surf can never wash behind the lower text.  The
          final frame stays pixel-identical to the still; only motion is damped.

OVERLAY : transparent PNG exported from the design tool (type + badges only).
PLATE   : the animated background video (any size; scaled to the overlay size).
OUT     : 24 fps H.264, same pixel size as the overlay.

The still poster is the final frame: every sprite is cut from the overlay and
moved rigidly, so kerning, colour and badges stay exact.  Motion timeline:

  0.00-0.60  header (crest, club line, league badge) fade in
  0.50-1.20  MATCH rises out of a clipping band
  0.75-1.45  DAY rises out of a clipping band
  1.30-1.80  HOME OPENER tag wipes left->right
  1.60-2.30  big date rises out of a clipping band
  1.90-2.60  weekday / time / year rise + fade, staggered
  2.30-2.90  gold rule draws left->right
  2.60-3.30  BEACH FC / vs / opponent rise + fade, staggered
  3.00-3.50  footer fades in
  7.00-8.00  one soft light glint sweeps across the headline
  then hold on the living background
"""
import sys, subprocess, numpy as np
from PIL import Image, ImageFilter

FF = __import__('shutil').which('ffmpeg') or '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
FPS = 24

# ---------------------------------------------------------------- easing
def ease_out_cubic(t):  return 1 - (1 - t) ** 3
def ease_out_back(t, s=1.2):
    t -= 1; return 1 + t * t * ((s + 1) * t + s)
def clamp01(x): return max(0.0, min(1.0, x))
def prog(t, t0, t1): return clamp01((t - t0) / (t1 - t0))

# ---------------------------------------------------------------- sprites
def split_bands(mask, axis, gap):
    """Return (start,end) index pairs of runs along `axis` separated by >gap empty lines."""
    proj = np.where(mask.any(axis=1 - axis))[0]
    if len(proj) == 0: return []
    runs = []; s = p = proj[0]
    for i in proj[1:]:
        if i > p + gap: runs.append((s, p)); s = i
        p = i
    runs.append((s, p)); return runs

def extract_sprites(rgba):
    a = rgba[..., 3] > 0
    sprites = []
    for y0, y1 in split_bands(a, 0, 6):
        sub = a[y0:y1 + 1]
        for x0, x1 in split_bands(sub, 1, 28):
            sprites.append(dict(y0=y0, y1=y1 + 1, x0=x0, x1=x1 + 1))
    return sprites

def name_sprites(sprites, W, H):
    """Assign roles by position (works for the Beach FC match-day layout)."""
    # sort by y then x
    sprites.sort(key=lambda s: (s['y0'], s['x0']))
    for s in sprites:
        cy = (s['y0'] + s['y1']) / 2; cx = (s['x0'] + s['x1']) / 2; h = s['y1'] - s['y0']; w = s['x1'] - s['x0']
        if cy < 0.07 * H:            s['role'] = 'badge_left' if cx < W / 2 else 'badge_right'
        elif cy < 0.20 * H and h > 0.06 * H: s['role'] = 'match' if cx < W / 2 else 'day'
        elif cy < 0.27 * H:          s['role'] = 'tag'
        elif cy < 0.83 * H and h > 0.08 * H: s['role'] = 'bigdate'
        elif cy < 0.83 * H:          s['role'] = 'meta'
        elif h <= 6 and w > 0.6 * W: s['role'] = 'rule'
        elif cy < 0.92 * H:          s['role'] = 'teams'
        else:                        s['role'] = 'footer'
    # stagger indices within groups
    counts = {}
    for s in sprites:
        s['k'] = counts.get(s['role'], 0); counts[s['role']] = s['k'] + 1
    return sprites

# ---------------------------------------------------------------- animation
def state(s, t):
    """Return (dy, opacity, wipe_fraction) for sprite s at time t. dy>0 = below final."""
    r, k = s['role'], s['k']
    if r in ('badge_left', 'badge_right'):
        return 0, ease_out_cubic(prog(t, 0.0 + 0.1 * k, 0.6 + 0.1 * k)), 1
    if r == 'match':
        p = prog(t, 0.50, 1.20); return int(round((1 - ease_out_cubic(p)) * 90)), min(1, p * 2.5), 1
    if r == 'day':
        p = prog(t, 0.75, 1.45); return int(round((1 - ease_out_cubic(p)) * 90)), min(1, p * 2.5), 1
    if r == 'tag':
        return 0, 1 if t > 1.30 else 0, ease_out_cubic(prog(t, 1.30, 1.80))
    if r == 'bigdate':
        p = prog(t, 1.60, 2.30); return int(round((1 - ease_out_cubic(p)) * 110)), min(1, p * 2.5), 1
    if r == 'meta':
        p = prog(t, 1.90 + 0.12 * k, 2.60 + 0.12 * k); return int(round((1 - ease_out_cubic(p)) * 40)), p, 1
    if r == 'rule':
        return 0, 1 if t > 2.30 else 0, ease_out_cubic(prog(t, 2.30, 2.90))
    if r == 'teams':
        p = prog(t, 2.60 + 0.12 * k, 3.30 + 0.12 * k); return int(round((1 - ease_out_cubic(p)) * 30)), p, 1
    if r == 'footer':
        return 0, prog(t, 3.00, 3.50), 1
    return 0, 1, 1

def glint(t, s, xs):
    """Brightness gain per column for the headline glint (7.0-8.0 s)."""
    if s['role'] not in ('match', 'day'): return None
    p = prog(t, 7.0, 8.0)
    if p <= 0 or p >= 1: return None
    x = -200 + p * (s['x1'] + 200 - s['x0'] + 200)  # sweep across sprite width with margins
    return 1.0 + 0.45 * np.exp(-((xs - x) / 70.0) ** 2)

# ---------------------------------------------------------------- still lock
def still_lock_mask(still_rgb):
    """1 where the plate must show the still: flat bands (row std < 12) touching the
    top/bottom edge, plus any saturated gold graphic (the ring), softly feathered."""
    H, W = still_rgb.shape[:2]
    a = still_rgb.astype(np.int16)
    rowstd = a.reshape(H, -1).std(axis=1)
    m = np.zeros((H, W), np.float32)
    flat = rowstd < 12
    y = 0
    while y < H and flat[y]: y += 1
    if y > 0: m[:max(0, y - 2)] = 1.0
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), dtype=np.float32) / 255.0
    return m

# ---------------------------------------------------------------- render
def main():
    overlay_p, plate_p, out_p = sys.argv[1:4]
    seconds = 15
    if '--seconds' in sys.argv: seconds = float(sys.argv[sys.argv.index('--seconds') + 1])
    ov = np.asarray(Image.open(overlay_p).convert('RGBA'), dtype=np.float32)
    H, W = ov.shape[:2]
    still = lock = None
    if '--still' in sys.argv:
        still = np.asarray(Image.open(sys.argv[sys.argv.index('--still') + 1]).convert('RGB').resize((W, H), Image.LANCZOS), dtype=np.float32)
        lock = still_lock_mask(still)[..., None]
        print('still lock covers %.1f%% of frame' % (100 * lock.mean()))
        if '--calm' in sys.argv:
            i = sys.argv.index('--calm'); cy0, cy1 = int(sys.argv[i + 1]), int(sys.argv[i + 2])
            ys = np.arange(H, dtype=np.float32)
            keep = np.clip((cy1 - ys) / (cy1 - cy0), 0, 1)          # 1 above cy0 -> 0 below cy1
            keep = 0.12 + 0.88 * keep                                  # leave 12% of the motion
            lock = np.maximum(lock, (1 - keep)[:, None, None] * np.ones((1, W, 1), np.float32))
            print('calm zone %d-%d applied' % (cy0, cy1))
    ring = None
    if '--ring' in sys.argv:
        r = np.asarray(Image.open(sys.argv[sys.argv.index('--ring') + 1]).convert('RGBA').resize((W, H), Image.LANCZOS), dtype=np.float32)
        ring = (r[..., :3], r[..., 3:4] / 255.0)
    sprites = name_sprites(extract_sprites(ov), W, H)
    for s in sprites:
        s['rgb'] = ov[s['y0']:s['y1'], s['x0']:s['x1'], :3]
        s['a'] = ov[s['y0']:s['y1'], s['x0']:s['x1'], 3] / 255.0
        print(f"{s['role']:12s} k={s['k']}  x {s['x0']}-{s['x1']}  y {s['y0']}-{s['y1']}")

    n_frames = int(round(seconds * FPS))
    dec = subprocess.Popen([FF, '-v', 'error', '-stream_loop', '-1', '-i', plate_p,
                            '-vf', f'scale={W}:{H}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen([FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                            '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'film',
                            '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out_p], stdin=subprocess.PIPE)
    for f in range(n_frames):
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3: break
        frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
        if lock is not None: frame = still * lock + frame * (1 - lock)
        if ring is not None: frame = frame * (1 - ring[1]) + ring[0] * ring[1]
        t = f / FPS
        for s in sprites:
            dy, op, wipe = state(s, t)
            if op <= 0: continue
            y0, y1, x0, x1 = s['y0'], s['y1'], s['x0'], s['x1']
            h = y1 - y0
            # rising sprite clipped to its final band: rows of the sprite that land inside [y0,y1)
            src_top = 0; src_bot = h - dy if dy > 0 else h
            if src_bot <= 0: continue
            rgb = s['rgb'][src_top:src_bot]; a = s['a'][src_top:src_bot] * op
            dst_y0 = y0 + dy; dst_y1 = dst_y0 + (src_bot - src_top)
            if wipe < 1:
                wx = int(round((x1 - x0) * wipe)); rgb = rgb[:, :wx]; a = a[:, :wx]
                if wx <= 0: continue
            dst_x1 = x0 + rgb.shape[1]
            g = glint(t, s, np.arange(x0, dst_x1, dtype=np.float32))
            if g is not None: rgb = np.clip(rgb * g[None, :, None], 0, 255)
            region = frame[dst_y0:dst_y1, x0:dst_x1]
            frame[dst_y0:dst_y1, x0:dst_x1] = region * (1 - a[..., None]) + rgb * a[..., None]
        enc.stdin.write(frame.clip(0, 255).astype(np.uint8).tobytes())
    enc.stdin.close(); enc.wait(); dec.terminate()
    print('wrote', out_p, n_frames, 'frames')

if __name__ == '__main__':
    main()
