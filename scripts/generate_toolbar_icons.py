#!/usr/bin/env python3
"""Generate unified stroke toolbar icons (dark ink on transparent)."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "icons"
SIZE = 128
STROKE = 10
COLOR = (28, 25, 23, 255)  # #1c1917
PAD = 22


def blank():
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))


def save(name: str, img: Image.Image):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.png"
    img.save(path, "PNG")
    print(f"  {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")


def play():
    im = blank()
    d = ImageDraw.Draw(im)
    # Rounded play triangle pointing right
    pts = [(40, 28), (40, 100), (100, 64)]
    d.polygon(pts, fill=COLOR)
    save("play", im)


def pause():
    im = blank()
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((36, 28, 54, 100), radius=6, fill=COLOR)
    d.rounded_rectangle((74, 28, 92, 100), radius=6, fill=COLOR)
    save("pause", im)


def replay():
    im = blank()
    d = ImageDraw.Draw(im)
    # Arc ring (open at top-right) + arrow head
    bbox = (28, 28, 100, 100)
    d.arc(bbox, start=40, end=320, fill=COLOR, width=STROKE)
    # Arrow head near open end (~40°)
    import math

    cx = cy = 64
    r = 36
    ang = math.radians(40)
    tip = (cx + r * math.cos(ang), cy + r * math.sin(ang))
    d.polygon(
        [
            tip,
            (tip[0] - 18, tip[1] - 4),
            (tip[0] - 4, tip[1] + 18),
        ],
        fill=COLOR,
    )
    save("replay", im)


def chevron(name: str, flip: bool):
    im = blank()
    d = ImageDraw.Draw(im)
    if flip:
        pts = [(78, 28), (42, 64), (78, 100)]
    else:
        pts = [(50, 28), (86, 64), (50, 100)]
    d.line(pts, fill=COLOR, width=STROKE, joint="curve")
    # thicken ends with caps
    for p in pts:
        d.ellipse((p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5), fill=COLOR)
    save(name, im)


def main():
    print("toolbar icons →", OUT)
    play()
    pause()
    replay()
    chevron("prev", flip=True)
    chevron("next", flip=False)
    print("done")


if __name__ == "__main__":
    main()
