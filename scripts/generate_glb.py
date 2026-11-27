#!/usr/bin/env python3
"""Generate framed translucent magnetic-tile GLBs (no Draco, no textures).

Size system (ScienceBaby / 7.5 cm class):
  world 1.0 = square magnet edge = 7.5 cm
  Only equal-length edges magnet-snap.
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path

# 7.5 cm modulus. Equilateral and hex share the square edge.
M_MM = 75.0
UNITS_PER_MM = 1.0 / M_MM
M = 1.0
SQUARE_EDGE = M
TRIANGLE_EDGE = M
RECT_LONG = M * 2  # 15 cm
RECT_SHORT = M
RIGHT_LEG = M
LARGE_BASE = M
LARGE_HEIGHT = 137.0 * UNITS_PER_MM
HEX_SIDE = TRIANGLE_EDGE


def pack_floats(values: list[float]) -> bytes:
    return struct.pack(f"<{len(values)}f", *values)


def pack_ushorts(values: list[int]) -> bytes:
    return struct.pack(f"<{len(values)}H", *values)


def align4(data: bytearray, pad: int = 0) -> None:
    while len(data) % 4:
        data.append(pad)


def _add_box(
    positions: list[tuple[float, float, float]],
    normals: list[tuple[float, float, float]],
    indices: list[int],
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z0: float,
    z1: float,
) -> None:
    faces = [
        ([(x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)], (0.0, 1.0, 0.0)),
        ([(x0, y0, z1), (x0, y0, z0), (x1, y0, z0), (x1, y0, z1)], (0.0, -1.0, 0.0)),
        ([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0.0, 0.0, 1.0)),
        ([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], (0.0, 0.0, -1.0)),
        ([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], (1.0, 0.0, 0.0)),
        ([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (-1.0, 0.0, 0.0)),
    ]
    for verts, n in faces:
        base = len(positions)
        for v in verts:
            positions.append(v)
            normals.append(n)
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])


def _centroid_xz(ring: list[tuple[float, float]]) -> tuple[float, float]:
    cx = sum(p[0] for p in ring) / len(ring)
    cz = sum(p[1] for p in ring) / len(ring)
    return cx, cz


def _scale_about(ring: list[tuple[float, float]], s: float) -> list[tuple[float, float]]:
    cx, cz = _centroid_xz(ring)
    return [((x - cx) * s + cx, (z - cz) * s + cz) for x, z in ring]


def _mean_radius(ring: list[tuple[float, float]]) -> float:
    cx, cz = _centroid_xz(ring)
    return sum(math.hypot(x - cx, z - cz) for x, z in ring) / len(ring)


def framed_polygon(
    outer: list[tuple[float, float]],
    frame: float = 0.09,
    thickness: float = 0.08,
    panel_t: float = 0.028,
    with_panel: bool = True,
):
    """Frame ring (+ optional inset panel) for an arbitrary convex XZ polygon."""
    r = max(_mean_radius(outer), 1e-6)
    s_inner = max(0.28, 1.0 - frame / r)
    inner = _scale_about(outer, s_inner)

    y0, y1 = 0.0, thickness
    py0 = (thickness - panel_t) * 0.5
    py1 = py0 + panel_t

    f_pos: list[tuple[float, float, float]] = []
    f_nor: list[tuple[float, float, float]] = []
    f_idx: list[int] = []
    n = len(outer)

    def add_prism_edge(
        a: tuple[float, float],
        b: tuple[float, float],
        c: tuple[float, float],
        d: tuple[float, float],
    ) -> None:
        base = len(f_pos)
        for (x, z), nn in [
            ((a[0], a[1]), (0.0, 1.0, 0.0)),
            ((b[0], b[1]), (0.0, 1.0, 0.0)),
            ((d[0], d[1]), (0.0, 1.0, 0.0)),
            ((c[0], c[1]), (0.0, 1.0, 0.0)),
        ]:
            f_pos.append((x, y1, z))
            f_nor.append(nn)
        f_idx.extend([base, base + 1, base + 2, base, base + 2, base + 3])
        base = len(f_pos)
        for (x, z), nn in [
            ((a[0], a[1]), (0.0, -1.0, 0.0)),
            ((c[0], c[1]), (0.0, -1.0, 0.0)),
            ((d[0], d[1]), (0.0, -1.0, 0.0)),
            ((b[0], b[1]), (0.0, -1.0, 0.0)),
        ]:
            f_pos.append((x, y0, z))
            f_nor.append(nn)
        f_idx.extend([base, base + 1, base + 2, base, base + 2, base + 3])
        ex, ez = b[0] - a[0], b[1] - a[1]
        nx, nz = ez, -ex
        ln = math.hypot(nx, nz) or 1.0
        nx, nz = nx / ln, nz / ln
        # Flip outward if needed (away from centroid)
        cx, cz = _centroid_xz(outer)
        mx, mz = (a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5
        if (mx - cx) * nx + (mz - cz) * nz < 0:
            nx, nz = -nx, -nz
        base = len(f_pos)
        for x, y, z in [
            (a[0], y0, a[1]),
            (b[0], y0, b[1]),
            (b[0], y1, b[1]),
            (a[0], y1, a[1]),
        ]:
            f_pos.append((x, y, z))
            f_nor.append((nx, 0.0, nz))
        f_idx.extend([base, base + 1, base + 2, base, base + 2, base + 3])
        base = len(f_pos)
        for x, y, z in [
            (d[0], y0, d[1]),
            (c[0], y0, c[1]),
            (c[0], y1, c[1]),
            (d[0], y1, d[1]),
        ]:
            f_pos.append((x, y, z))
            f_nor.append((-nx, 0.0, -nz))
        f_idx.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    for i in range(n):
        j = (i + 1) % n
        add_prism_edge(outer[i], outer[j], inner[i], inner[j])

    p_pos: list[tuple[float, float, float]] = []
    p_nor: list[tuple[float, float, float]] = []
    p_idx: list[int] = []
    if with_panel:
        panel = _scale_about(inner, 0.96)
        top_i: list[int] = []
        bot_i: list[int] = []
        for x, z in panel:
            top_i.append(len(p_pos))
            p_pos.append((x, py1, z))
            p_nor.append((0.0, 1.0, 0.0))
            bot_i.append(len(p_pos))
            p_pos.append((x, py0, z))
            p_nor.append((0.0, -1.0, 0.0))
        for i in range(1, n - 1):
            p_idx.extend([top_i[0], top_i[i], top_i[i + 1]])
            p_idx.extend([bot_i[0], bot_i[i + 1], bot_i[i]])
        for i in range(n):
            j = (i + 1) % n
            ex, ez = panel[j][0] - panel[i][0], panel[j][1] - panel[i][1]
            nx, nz = ez, -ex
            ln = math.hypot(nx, nz) or 1.0
            nx, nz = nx / ln, nz / ln
            cx, cz = _centroid_xz(panel)
            mx, mz = (panel[i][0] + panel[j][0]) * 0.5, (panel[i][1] + panel[j][1]) * 0.5
            if (mx - cx) * nx + (mz - cz) * nz < 0:
                nx, nz = -nx, -nz
            base = len(p_pos)
            for x, y, z, nn in [
                (panel[i][0], py0, panel[i][1], (nx, 0.0, nz)),
                (panel[j][0], py0, panel[j][1], (nx, 0.0, nz)),
                (panel[j][0], py1, panel[j][1], (nx, 0.0, nz)),
                (panel[i][0], py1, panel[i][1], (nx, 0.0, nz)),
            ]:
                p_pos.append((x, y, z))
                p_nor.append(nn)
            p_idx.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    return (f_pos, f_nor, f_idx), (p_pos, p_nor, p_idx)


def ring_square(size: float = SQUARE_EDGE) -> list[tuple[float, float]]:
    h = size / 2
    return [(-h, -h), (h, -h), (h, h), (-h, h)]


def ring_rect(long_: float = RECT_LONG, short: float = RECT_SHORT) -> list[tuple[float, float]]:
    hx, hz = long_ / 2, short / 2
    return [(-hx, -hz), (hx, -hz), (hx, hz), (-hx, hz)]


def ring_equilateral(size: float = TRIANGLE_EDGE) -> list[tuple[float, float]]:
    h = size * math.sqrt(3) / 2
    # tip +Z, base toward -Z, centroid at origin
    return [(0.0, 2 * h / 3), (-size / 2, -h / 3), (size / 2, -h / 3)]


def ring_right(leg: float = RIGHT_LEG) -> list[tuple[float, float]]:
    # Isosceles right 45-45-90: legs +X / +Z; centroid origin
    raw = [(0.0, 0.0), (leg, 0.0), (0.0, leg)]
    cx = (raw[0][0] + raw[1][0] + raw[2][0]) / 3
    cz = (raw[0][1] + raw[1][1] + raw[2][1]) / 3
    return [(x - cx, z - cz) for x, z in raw]


def ring_large(base: float = LARGE_BASE, height: float = LARGE_HEIGHT) -> list[tuple[float, float]]:
    # Isosceles: base along X, tip +Z; centroid origin
    raw = [(-base / 2, 0.0), (base / 2, 0.0), (0.0, height)]
    cx = (raw[0][0] + raw[1][0] + raw[2][0]) / 3
    cz = (raw[0][1] + raw[1][1] + raw[2][1]) / 3
    return [(x - cx, z - cz) for x, z in raw]


def ring_hex(side: float = HEX_SIDE) -> list[tuple[float, float]]:
    # Flat-top hex; radius = side for regular hex
    out = []
    for i in range(6):
        ang = math.pi / 6 + i * math.pi / 3
        out.append((side * math.cos(ang), side * math.sin(ang)))
    return out


def framed_square(**kw):
    return framed_polygon(ring_square(), **kw)


def framed_rectangle(**kw):
    return framed_polygon(ring_rect(), **kw)


def framed_triangle(**kw):
    return framed_polygon(ring_equilateral(), **kw)


def framed_right(**kw):
    return framed_polygon(ring_right(), **kw)


def framed_large(**kw):
    return framed_polygon(ring_large(), **kw)


def framed_hex(**kw):
    return framed_polygon(ring_hex(), **kw)


def framed_window(**kw):
    """Hollow 口-shape: square frame, no panel."""
    return framed_polygon(ring_square(), with_panel=False, **kw)


def build_glb_framed(
    frame_geom,
    panel_geom,
    frame_rgba: list[float],
    panel_rgba: list[float],
    out_path: Path,
) -> None:
    f_pos, f_nor, f_idx = frame_geom
    p_pos, p_nor, p_idx = panel_geom

    all_pos = f_pos + p_pos
    all_nor = f_nor + p_nor
    f_count = len(f_pos)

    # Hollow window: duplicate a tiny degenerate panel so GLB stays 2-primitive
    if not p_pos:
        p_pos = [(0.0, 0.04, 0.0)] * 3
        p_nor = [(0.0, 1.0, 0.0)] * 3
        p_idx = [0, 1, 2]
        panel_rgba = [frame_rgba[0], frame_rgba[1], frame_rgba[2], 0.0]
        all_pos = f_pos + p_pos
        all_nor = f_nor + p_nor

    pos_bytes = pack_floats([c for p in all_pos for c in p])
    nor_bytes = pack_floats([c for n in all_nor for c in n])
    f_idx_bytes = pack_ushorts(f_idx)
    p_idx_bytes = pack_ushorts([i + f_count for i in p_idx])

    xs = [p[0] for p in all_pos]
    ys = [p[1] for p in all_pos]
    zs = [p[2] for p in all_pos]
    min_p = [min(xs), min(ys), min(zs)]
    max_p = [max(xs), max(ys), max(zs)]

    bin_data = bytearray()
    pos_offset = 0
    bin_data.extend(pos_bytes)
    align4(bin_data)
    nor_offset = len(bin_data)
    bin_data.extend(nor_bytes)
    align4(bin_data)
    f_idx_offset = len(bin_data)
    bin_data.extend(f_idx_bytes)
    align4(bin_data)
    p_idx_offset = len(bin_data)
    bin_data.extend(p_idx_bytes)
    align4(bin_data)

    gltf = {
        "asset": {"version": "2.0", "generator": "magnet-tile-framed"},
        "scenes": [{"nodes": [0]}],
        "scene": 0,
        "nodes": [{"mesh": 0, "name": "tile"}],
        "meshes": [
            {
                "primitives": [
                    {
                        "attributes": {"POSITION": 0, "NORMAL": 1},
                        "indices": 2,
                        "material": 0,
                    },
                    {
                        "attributes": {"POSITION": 0, "NORMAL": 1},
                        "indices": 3,
                        "material": 1,
                    },
                ]
            }
        ],
        "materials": [
            {
                "name": "frame",
                "pbrMetallicRoughness": {
                    "baseColorFactor": frame_rgba,
                    "metallicFactor": 0.12,
                    "roughnessFactor": 0.28,
                },
                "alphaMode": "BLEND",
                "doubleSided": True,
            },
            {
                "name": "panel",
                "pbrMetallicRoughness": {
                    "baseColorFactor": panel_rgba,
                    "metallicFactor": 0.0,
                    "roughnessFactor": 0.12,
                },
                "alphaMode": "BLEND",
                "doubleSided": True,
            },
        ],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": len(all_pos),
                "type": "VEC3",
                "max": max_p,
                "min": min_p,
            },
            {
                "bufferView": 1,
                "componentType": 5126,
                "count": len(all_nor),
                "type": "VEC3",
            },
            {
                "bufferView": 2,
                "componentType": 5123,
                "count": len(f_idx),
                "type": "SCALAR",
            },
            {
                "bufferView": 3,
                "componentType": 5123,
                "count": len(p_idx),
                "type": "SCALAR",
            },
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": pos_offset, "byteLength": len(pos_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": nor_offset, "byteLength": len(nor_bytes), "target": 34962},
            {
                "buffer": 0,
                "byteOffset": f_idx_offset,
                "byteLength": len(f_idx_bytes),
                "target": 34963,
            },
            {
                "buffer": 0,
                "byteOffset": p_idx_offset,
                "byteLength": len(p_idx_bytes),
                "target": 34963,
            },
        ],
        "buffers": [{"byteLength": len(bin_data)}],
    }

    json_bytes = bytearray(json.dumps(gltf, separators=(",", ":")).encode("utf-8"))
    align4(json_bytes, pad=0x20)
    align4(bin_data, pad=0x00)

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
    out = bytearray()
    out.extend(struct.pack("<4sII", b"glTF", 2, total_len))
    out.extend(struct.pack("<I4s", len(json_bytes), b"JSON"))
    out.extend(json_bytes)
    out.extend(struct.pack("<I4s", len(bin_data), b"BIN\x00"))
    out.extend(bin_data)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(out)
    faces = (len(f_idx) + len(p_idx)) // 3
    print(
        f"Wrote {out_path.name} ({out_path.stat().st_size} B, ~{faces} tris)"
    )


def hex_to_rgba(hex_color: str, alpha: float = 1.0) -> list[float]:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return [r / 255, g / 255, b / 255, alpha]


KIND_BUILDERS = {
    "square": framed_square,
    "rect": framed_rectangle,
    "triangle": framed_triangle,
    "right": framed_right,
    "large": framed_large,
    "hex": framed_hex,
    "window": framed_window,
}


def write_variant(name: str, color: str, kind: str, assets: Path) -> None:
    builder = KIND_BUILDERS[kind]
    frame_g, panel_g = builder()
    frame_rgba = hex_to_rgba(color, 0.98)
    panel_rgba = hex_to_rgba(color, 0.18)
    build_glb_framed(frame_g, panel_g, frame_rgba, panel_rgba, assets / f"{name}.glb")


def main():
    root = Path(__file__).resolve().parents[1]
    assets = root / "assets"

    variants = {
        # defaults
        # Shape identity colors (docs/ui-copy-guidelines.md). Extra variants stay in-family.
        "tile-square": ("#38BDF8", "square"),
        "tile-triangle": ("#A78BFA", "triangle"),
        "tile-rect": ("#FB923C", "rect"),
        "tile-right": ("#FACC15", "right"),
        "tile-large": ("#F87171", "large"),
        "tile-hex": ("#10B981", "hex"),
        "tile-window": ("#34D399", "window"),
        "tile-square-red": ("#FB7185", "square"),
        "tile-square-blue": ("#38BDF8", "square"),
        "tile-square-yellow": ("#FFE66D", "square"),
        "tile-triangle-green": ("#C4B5FD", "triangle"),
        "tile-triangle-orange": ("#8B5CF6", "triangle"),
        "tile-rect-blue": ("#FDBA74", "rect"),
        "tile-rect-red": ("#F97316", "rect"),
        "tile-right-green": ("#FDE68A", "right"),
        "tile-right-orange": ("#FACC15", "right"),
        "tile-large-yellow": ("#FECACA", "large"),
        "tile-large-orange": ("#F87171", "large"),
        "tile-hex-green": ("#10B981", "hex"),
        "tile-hex-blue": ("#6EE7B7", "hex"),
        "tile-window-blue": ("#34D399", "window"),
        "tile-window-yellow": ("#A7F3D0", "window"),
    }
    for name, (color, kind) in variants.items():
        write_variant(name, color, kind, assets)


if __name__ == "__main__":
    main()
