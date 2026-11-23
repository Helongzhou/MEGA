#!/usr/bin/env python3
"""Generate short kid-friendly placeholder SFX as mp3 via ffmpeg."""

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
        # soft attack
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


def celebrate(duration: float = 2.0, volume: float = 0.7, rate: int = 22050):
    n = int(rate * duration)
    out = [0.0] * n
    notes = [523.25, 659.25, 783.99, 1046.5]  # C5 E5 G5 C6
    for idx, freq in enumerate(notes):
        start = int(rate * (0.08 + idx * 0.28))
        for i in range(int(rate * 0.45)):
            if start + i >= n:
                break
            t = i / rate
            env = math.exp(-2.2 * t)
            out[start + i] += volume * 0.45 * env * math.sin(2 * math.pi * freq * t)
    # soft sparkle
    for i in range(n):
        t = i / rate
        out[i] += volume * 0.08 * math.exp(-1.5 * t) * math.sin(2 * math.pi * 1568 * t)
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
        "pop.mp3": chirp(420, 880, 0.22, 0.6),
        "slide.mp3": tone(220, 0.35, 0.5),
        "celebrate.mp3": celebrate(2.0, 0.7),
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
