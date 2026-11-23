#!/usr/bin/env python3
"""Generate simple low-poly magnetic tile GLB files (no Draco, no textures)."""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path


def pack_floats(values: list[float]) -> bytes:
    return struct.pack(f"<{len(values)}f", *values)


def pack_ushorts(values: list[int]) -> bytes:
    return struct.pack(f"<{len(values)}H", *values)


def align4(data: bytearray) -> None:
    while len(data) % 4:
        data.append(0)


def bevel_square(size: float = 1.0, thickness: float = 0.12, bevel: float = 0.12, segments: int = 3):
    """Rounded square slab centered at origin, sitting on y=0."""
    half = size / 2
    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    indices: list[int] = []

    def add_vertex(p, n):
        positions.append(p)
        normals.append(n)
        return len(positions) - 1

    # Top / bottom faces with inset for soft edge look
    inset = half - bevel
    y_top = thickness
    y_bot = 0.0

    # Corner arcs in XZ
    corners = [
        (inset, inset),
        (-inset, inset),
        (-inset, -inset),
        (inset, -inset),
    ]
    corner_centers = corners
    start_angles = [0, math.pi / 2, math.pi, 3 * math.pi / 2]

    ring_top: list[int] = []
    ring_bot: list[int] = []
    for (cx, cz), a0 in zip(corner_centers, start_angles):
        for s in range(segments + 1):
            a = a0 + (math.pi / 2) * (s / segments)
            x = cx + bevel * math.cos(a)
            z = cz + bevel * math.sin(a)
            # Soft top normal tilted outward a bit
            nx, nz = math.cos(a) * 0.35, math.sin(a) * 0.35
            ny = math.sqrt(max(0.0, 1 - nx * nx - nz * nz))
            ring_top.append(add_vertex((x, y_top, z), (nx, ny, nz)))
            ring_bot.append(add_vertex((x, y_bot, z), (nx, -ny, nz)))

    # Cap centers
    top_c = add_vertex((0, y_top, 0), (0, 1, 0))
    bot_c = add_vertex((0, y_bot, 0), (0, -1, 0))

    n = len(ring_top)
    for i in range(n):
        j = (i + 1) % n
        indices.extend([top_c, ring_top[i], ring_top[j]])
        indices.extend([bot_c, ring_bot[j], ring_bot[i]])
        # Side quads
        a, b = ring_top[i], ring_top[j]
        c, d = ring_bot[j], ring_bot[i]
        indices.extend([a, d, b, b, d, c])

    return positions, normals, indices


def equilateral_triangle_clean(size: float = 1.2, thickness: float = 0.12):
    """Clean low-face equilateral triangle prism."""
    h = size * math.sqrt(3) / 2
    raw = [
        (0.0, 2 * h / 3),
        (-size / 2, -h / 3),
        (size / 2, -h / 3),
    ]
    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    indices: list[int] = []

    def add(p, n):
        positions.append(p)
        normals.append(n)
        return len(positions) - 1

    y_top, y_bot = thickness, 0.0
    t = [add((x, y_top, z), (0, 1, 0)) for x, z in raw]
    b = [add((x, y_bot, z), (0, -1, 0)) for x, z in raw]
    indices.extend([t[0], t[1], t[2], b[0], b[2], b[1]])

    for i in range(3):
        j = (i + 1) % 3
        mx = (raw[i][0] + raw[j][0]) / 2
        mz = (raw[i][1] + raw[j][1]) / 2
        length = math.hypot(mx, mz) or 1.0
        nx, nz = mx / length, mz / length
        a = add((raw[i][0], y_top, raw[i][1]), (nx, 0, nz))
        bb = add((raw[j][0], y_top, raw[j][1]), (nx, 0, nz))
        c = add((raw[j][0], y_bot, raw[j][1]), (nx, 0, nz))
        d = add((raw[i][0], y_bot, raw[i][1]), (nx, 0, nz))
        indices.extend([a, d, bb, bb, d, c])

    return positions, normals, indices


def build_glb(positions, normals, indices, color_rgba, out_path: Path):
    pos_bytes = pack_floats([c for p in positions for c in p])
    nor_bytes = pack_floats([c for n in normals for c in n])
    idx_bytes = pack_ushorts(indices)

    # Bounds
    xs = [p[0] for p in positions]
    ys = [p[1] for p in positions]
    zs = [p[2] for p in positions]
    min_p = [min(xs), min(ys), min(zs)]
    max_p = [max(xs), max(ys), max(zs)]

    bin_data = bytearray()
    pos_offset = 0
    bin_data.extend(pos_bytes)
    align4(bin_data)
    nor_offset = len(bin_data)
    bin_data.extend(nor_bytes)
    align4(bin_data)
    idx_offset = len(bin_data)
    bin_data.extend(idx_bytes)
    align4(bin_data)

    gltf = {
        "asset": {"version": "2.0", "generator": "magnet-tile-generator"},
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
                    }
                ]
            }
        ],
        "materials": [
            {
                "name": "tile-mat",
                "pbrMetallicRoughness": {
                    "baseColorFactor": color_rgba,
                    "metallicFactor": 0.0,
                    "roughnessFactor": 0.8,
                },
                "doubleSided": True,
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": len(positions),
                "type": "VEC3",
                "max": max_p,
                "min": min_p,
            },
            {
                "bufferView": 1,
                "componentType": 5126,
                "count": len(normals),
                "type": "VEC3",
            },
            {
                "bufferView": 2,
                "componentType": 5123,
                "count": len(indices),
                "type": "SCALAR",
            },
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": pos_offset, "byteLength": len(pos_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": nor_offset, "byteLength": len(nor_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": idx_offset, "byteLength": len(idx_bytes), "target": 34963},
        ],
        "buffers": [{"byteLength": len(bin_data)}],
    }

    json_bytes = bytearray(json.dumps(gltf, separators=(",", ":")).encode("utf-8"))
    align4(json_bytes)

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
    out = bytearray()
    out.extend(struct.pack("<4sII", b"glTF", 2, total_len))
    out.extend(struct.pack("<I4s", len(json_bytes), b"JSON"))
    out.extend(json_bytes)
    out.extend(struct.pack("<I4s", len(bin_data), b"BIN\x00"))
    out.extend(bin_data)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(out)
    faces = len(indices) // 3
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes, ~{faces} tris, {len(positions)} verts)")


def hex_to_rgba(hex_color: str) -> list[float]:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return [r / 255, g / 255, b / 255, 1.0]


def main():
    root = Path(__file__).resolve().parents[1]
    assets = root / "assets"

    # Default display colors for step 2 verification
    sq_pos, sq_nor, sq_idx = bevel_square()
    build_glb(sq_pos, sq_nor, sq_idx, hex_to_rgba("#FF6B6B"), assets / "tile-square.glb")

    tri_pos, tri_nor, tri_idx = equilateral_triangle_clean()
    build_glb(tri_pos, tri_nor, tri_idx, hex_to_rgba("#95E1D3"), assets / "tile-triangle.glb")

    # Colored variants for works
    variants = {
        "tile-square-red": ("#FF6B6B", "square"),
        "tile-square-blue": ("#4ECDC4", "square"),
        "tile-square-yellow": ("#FFE66D", "square"),
        "tile-triangle-green": ("#95E1D3", "triangle"),
        "tile-triangle-orange": ("#F38181", "triangle"),
    }
    for name, (color, kind) in variants.items():
        if kind == "square":
            p, n, i = bevel_square()
        else:
            p, n, i = equilateral_triangle_clean()
        build_glb(p, n, i, hex_to_rgba(color), assets / f"{name}.glb")


if __name__ == "__main__":
    main()
