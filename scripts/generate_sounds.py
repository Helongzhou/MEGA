#!/usr/bin/env python3
"""Generate kid-friendly SFX as mp3 via ffmpeg (snap / slide / celebrate / ambient)."""

from __future__ import annotations

import math
import struct
import subprocess
import tempfile
import wave
from pathlib import Path


def write_wav(path: Path, samples: list[float], rate: int = 22050) -> None:
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        frames = b"".join(
            struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples
        )
        wf.writeframes(frames)


def tone(freq: float, duration: float, volume: float, rate: int = 22050, decay: bool = True):
    n = int(rate * duration)
    out = []
    for i in range(n):
        t = i / rate
        env = math.exp(-4 * t / duration) if decay else 1.0
        attack = min(1.0, i / (rate * 0.01))
        out.append(volume * attack * env * math.sin(2 * math.pi * freq * t))
    return out


def chirp(f0: float, f1: float, duration: float, volume: float, rate: int = 22050):
    n = int(rate * duration)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / rate
        f = f0 + (f1 - f0) * (t / duration)
        phase += 2 * math.pi * f / rate
        env = math.exp(-3 * t / duration)
        attack = min(1.0, i / (rate * 0.008))
        out.append(volume * attack * env * math.sin(phase))
    return out


def snap_click(duration: float = 0.12, volume: float = 0.75, rate: int = 22050):
    """Short plastic 「啪」— noise burst + mid thock."""
    n = int(rate * duration)
    out = [0.0] * n
    # Deterministic soft noise (no import random — stable asset)
    seed = 12345
    for i in range(n):
        t = i / rate
        seed = (1103515245 * seed + 12345) & 0x7FFFFFFF
        noise = (seed / 0x7FFFFFFF) * 2.0 - 1.0
        env = math.exp(-28 * t)
        attack = min(1.0, i / (rate * 0.002))
        thock = math.sin(2 * math.pi * 180 * t) * math.exp(-22 * t)
        click = math.sin(2 * math.pi * 920 * t) * math.exp(-40 * t)
        out[i] = volume * attack * (0.55 * noise * env + 0.35 * thock + 0.25 * click)
        out[i] = max(-1.0, min(1.0, out[i]))
    return out


def ambient_soft(duration: float = 8.0, volume: float = 0.12, rate: int = 22050):
    """Loopable soft bed — two slow sine pads, gentle fade edges."""
    n = int(rate * duration)
    out = [0.0] * n
    fade = int(rate * 0.6)
    for i in range(n):
        t = i / rate
        pad = (
            0.55 * math.sin(2 * math.pi * 110 * t)
            + 0.35 * math.sin(2 * math.pi * 164.8 * t)
            + 0.2 * math.sin(2 * math.pi * 220 * t + 0.4)
        )
        # Slow amplitude breathe
        breathe = 0.85 + 0.15 * math.sin(2 * math.pi * t / duration)
        env = 1.0
        if i < fade:
            env = i / fade
        elif i > n - fade:
            env = (n - i) / fade
        out[i] = max(-1.0, min(1.0, volume * breathe * env * pad))
    return out


def celebrate(duration: float = 1.8, volume: float = 0.62, rate: int = 22050):
    """Cheer: a bright 'yay' rush plus a rising major chord."""
    n = int(rate * duration)
    out = [0.0] * n
    seed = 99
    for i in range(n):
        t = i / rate
        seed = (1103515245 * seed + 12345) & 0x7FFFFFFF
        noise = (seed / 0x7FFFFFFF) * 2.0 - 1.0
        shout = math.exp(-2.4 * t) * math.sin(2 * math.pi * (420 + 180 * t) * t)
        rush = noise * math.exp(-6 * max(0.0, t - 0.05)) * (1 if t < 0.35 else math.exp(-8 * (t - 0.35)))
        out[i] += volume * (0.35 * shout + 0.22 * rush)
    notes = [523.25, 659.25, 783.99, 1046.5]
    for idx, freq in enumerate(notes):
        start = int(rate * (0.12 + idx * 0.22))
        for i in range(int(rate * 0.4)):
            if start + i >= n:
                break
            t = i / rate
            env = math.exp(-2.4 * t)
            out[start + i] += volume * 0.4 * env * math.sin(2 * math.pi * freq * t)
    for i in range(n):
        out[i] = max(-1.0, min(1.0, out[i]))
    return out


def to_mp3(wav_path: Path, mp3_path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(wav_path),
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "5",
            str(mp3_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main():
    root = Path(__file__).resolve().parents[1]
    sounds = root / "sounds"
    sounds.mkdir(parents=True, exist_ok=True)

    specs = {
        "pop.mp3": snap_click(0.1, 0.58),
        "slide.mp3": chirp(280, 520, 0.28, 0.32),
        "celebrate.mp3": celebrate(),
        "ambient.mp3": ambient_soft(8.0, 0.07),
    }

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        for name, samples in specs.items():
            wav = tmp_path / (name.replace(".mp3", ".wav"))
            write_wav(wav, samples)
            out = sounds / name
            to_mp3(wav, out)
            print(f"Wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
