"""The social card: 1200x630, the size every platform actually crops to.

Composed rather than cropped from a photograph, because the card is seen
at thumbnail size in a feed and a cropped room says nothing at that size.
The wordmark and one line of proposition do.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
INK = (10, 10, 9)
CREAM = (241, 237, 229)
GOLD = (183, 154, 104)

F = str(Path(__file__).parent / "og-fonts") + "/"
OUT = str(Path(__file__).parent.parent / "public/images/og-card.jpg")

card = Image.new("RGB", (W, H), INK)

# --- the photograph, on the right, dissolving into the ink -------------
photo = Image.open(str(Path(__file__).parent.parent / "public/images/pass-light.jpg")).convert("RGB")
panel_w = 620
target = panel_w / H
pw, ph = photo.size
crop_h = min(ph, int(pw / target))
top = int((ph - crop_h) * 0.46)          # bias up: keep lamps and plate
photo = photo.crop((0, top, pw, top + crop_h)).resize((panel_w, H), Image.LANCZOS)

# Darken so the type stays dominant at thumbnail size.
photo = Image.blend(photo, Image.new("RGB", photo.size, INK), 0.28)

# Fade its left edge into the ink rather than butting a hard seam. The
# ramp runs most of the panel's width: a short one leaves a visible
# vertical join where the photograph's own darkness meets flat ink.
mask = Image.new("L", (panel_w, H), 255)
md = ImageDraw.Draw(mask)
ramp = int(panel_w * 0.78)
for x in range(ramp):
    md.line([(x, 0), (x, H)], fill=int(255 * (x / ramp) ** 1.7))
card.paste(photo, (W - panel_w, 0), mask)

# Close the right edge back into ink. The photograph carries a lit wall
# at that side, and a card that runs bright to its own border looks
# cropped out of something larger rather than composed.
edge = Image.new("RGB", (W, H), INK)
em = Image.new("L", (W, H), 0)
ed = ImageDraw.Draw(em)
for i in range(150):
    ed.line([(W - 1 - i, 0), (W - 1 - i, H)], fill=int(215 * (1 - i / 150) ** 1.4))
card.paste(edge, (0, 0), em)

d = ImageDraw.Draw(card)

# --- the pass mark: an opening framed on three sides, four points ------
x0, y0, s = 84, 92, 34
lw = 3
d.line([(x0, y0 + s * 0.5), (x0, y0), (x0 + s, y0), (x0 + s, y0 + s * 0.5)],
       fill=GOLD, width=lw, joint="curve")
for i in range(4):
    cx = x0 + s * (0.13 + i * 0.25)
    d.ellipse([cx - 2.4, y0 + s * 0.68, cx + 2.4, y0 + s * 0.68 + 4.8], fill=GOLD)

# --- the wordmark -----------------------------------------------------
dm = ImageFont.truetype(F + "dmserif.ttf", 118)
d.text((84, 214), "THE PASS", font=dm, fill=CREAM)

it = ImageFont.truetype(F + "instrument-italic.ttf", 46)
d.text((88, 352), "by Madison Four", font=it, fill=GOLD)

# --- rule, then the proposition in letterspaced caps -------------------
d.line([(88, 438), (470, 438)], fill=(183, 154, 104, 90), width=1)

inter = ImageFont.truetype(F + "inter-semibold.ttf", 21)
label, tracking, x = "RESTAURANT WEBSITES, CRAFTED.", 3.4, 88.0
for ch in label:
    d.text((x, 470), ch, font=inter, fill=CREAM)
    x += d.textlength(ch, font=inter) + tracking

# --- a hairline frame, the site's own inset ring ----------------------
d.rectangle([26, 26, W - 27, H - 27], outline=(72, 62, 46), width=1)

card.save(OUT, quality=92, optimize=True, progressive=True)
print("wrote", OUT, card.size)
