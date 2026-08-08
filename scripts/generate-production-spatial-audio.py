#!/usr/bin/env python3
"""Deterministically forge and verify the launch spatial audio pack.

This intentionally replaces the historical eight-second proof tone with distinct,
long-form production beds and bounded interaction cues. No network provider or
secret is required. Output is canonical Opus plus a machine-readable receipt.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 48_000
DURATION = 60
N = SR * DURATION
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "urai-tier1/public/assets/urai/generated/audio"
RECEIPT = ROOT / "operations/assets/production-receipts/spatial-audio-production-v1.json"
OUT.mkdir(parents=True, exist_ok=True)
RECEIPT.parent.mkdir(parents=True, exist_ok=True)

AMBIENT = {
    "home-ambient-v1": dict(seed=1101, noise=[(1.15, 80, 2500, .032), (.2, 2200, 9000, .007)], tones=[(55, .018), (110, .009), (220, .004)], width=.12),
    "ground-ambient-v1": dict(seed=2202, noise=[(1.7, 28, 900, .038), (.8, 180, 2200, .008)], tones=[(48, .019), (72, .010), (96, .007), (192, .0025)], width=.07),
    "life-map-ambient-v1": dict(seed=3303, noise=[(.7, 90, 5000, .018), (0, 2600, 12000, .008)], tones=[(110, .011), (164.8, .008), (220, .006), (329.6, .0035)], width=.17),
    "focus-ambient-v1": dict(seed=4404, noise=[(1.45, 40, 1700, .026), (.7, 700, 3500, .004)], tones=[(70, .014), (105, .008), (140, .005)], width=.055),
    "replay-ambient-v1": dict(seed=5505, noise=[(1.35, 35, 2400, .030), (.5, 1200, 7000, .005)], tones=[(55, .014), (82.5, .009), (123.75, .005), (247.5, .002)], width=.14),
}

CAPTIONS = {
    "home-ambient-v1": "Soft wind, distant leaves, and a low sanctuary tone.",
    "ground-ambient-v1": "Quiet civic space, footsteps at a distance, and restrained environmental movement.",
    "life-map-ambient-v1": "A spacious tonal field with subtle memory-star shimmer.",
    "focus-ambient-v1": "A close, stable tone supporting sustained attention.",
    "replay-ambient-v1": "A restrained cinematic bed that follows the memory sequence.",
    "portal-transition-v1": "A brief rising spatial tone marking realm travel.",
    "orb-confirm-v1": "A soft two-note confirmation.",
    "ui-error-v1": "A low, brief error tone accompanied by visible text.",
}

MAX_BYTES = {
    "home-ambient-v1": 2_097_152,
    "ground-ambient-v1": 2_097_152,
    "life-map-ambient-v1": 2_097_152,
    "focus-ambient-v1": 1_572_864,
    "replay-ambient-v1": 2_097_152,
    "portal-transition-v1": 262_144,
    "orb-confirm-v1": 131_072,
    "ui-error-v1": 131_072,
}


def periodic_noise(seed: int, alpha: float, lo: float, hi: float) -> np.ndarray:
    rng = np.random.default_rng(seed)
    freqs = np.fft.rfftfreq(N, 1 / SR)
    amp = np.zeros_like(freqs)
    mask = (freqs >= lo) & (freqs <= hi)
    amp[mask] = 1 / np.maximum(freqs[mask], 1.0) ** (alpha / 2)
    phase = rng.uniform(0, 2 * np.pi, len(freqs))
    spec = amp * np.exp(1j * phase)
    spec[0] = 0
    signal = np.fft.irfft(spec, n=N)
    signal /= max(float(np.std(signal)), 1e-9)
    return signal.astype(np.float32)


def tone(freq: float, amp: float, phase: float = 0, cycles_mod: int = 0, mod_depth: float = 0) -> np.ndarray:
    t = np.arange(N, dtype=np.float64) / SR
    env = 1.0
    if cycles_mod:
        env = 1 - mod_depth / 2 + (mod_depth / 2) * np.sin(2 * np.pi * cycles_mod * t / DURATION + phase)
    return (amp * env * np.sin(2 * np.pi * freq * t + phase)).astype(np.float32)


def stereo(signal: np.ndarray, width: float, cycles: int, phase: float = 0) -> np.ndarray:
    t = np.arange(N, dtype=np.float64) / SR
    pan = .5 + width * np.sin(2 * np.pi * cycles * t / DURATION + phase)
    return np.stack([signal * np.sqrt(np.clip(1 - pan, 0, 1)), signal * np.sqrt(np.clip(pan, 0, 1))], axis=1)


def write_wav(path: Path, samples: np.ndarray) -> None:
    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())


def make_ambient(name: str, spec: dict, wav_path: Path) -> None:
    mix = np.zeros((N, 2), dtype=np.float32)
    for i, (alpha, lo, hi, gain) in enumerate(spec["noise"]):
        mix += stereo(periodic_noise(spec["seed"] + i, alpha, lo, hi) * gain, spec["width"], i + 1, i * .7)
    for i, (freq, amp) in enumerate(spec["tones"]):
        mix += stereo(tone(freq, amp, i * .37, i + 1, .18), spec["width"] * .55, i + 2, i)
    mix = np.tanh(mix * .9) * .55
    write_wav(wav_path, mix)


def cue_samples(name: str, seconds: float) -> np.ndarray:
    count = int(SR * seconds)
    t = np.arange(count, dtype=np.float64) / SR
    if name == "portal-transition-v1":
        env = np.sin(np.pi * np.clip(t / max(t[-1], 1e-6), 0, 1)) ** 1.4
        ratio = 720 / 110
        phase = 2 * np.pi * 110 * max(t[-1], 1e-6) / math.log(ratio) * (np.power(ratio, t / max(t[-1], 1e-6)) - 1)
        rng = np.random.default_rng(777)
        noise = rng.normal(0, 1, count)
        noise = np.convolve(noise, np.ones(240) / 240, mode="same")
        noise = noise / max(float(np.std(noise)), 1e-9) * .055
        mono = (.20 * np.sin(phase) + noise) * env
        pan = np.clip(t / max(t[-1], 1e-6), 0, 1)
        return np.stack([mono * np.sqrt(1 - pan * .45), mono * np.sqrt(.55 + pan * .45)], axis=1)
    if name == "orb-confirm-v1":
        env = np.exp(-3.2 * t)
        note1 = np.sin(2 * np.pi * 523.25 * t) * (t < .48)
        note2 = np.sin(2 * np.pi * 659.25 * np.maximum(t - .18, 0)) * (t >= .18)
        mono = (.16 * note1 + .14 * note2 + .035 * np.sin(2 * np.pi * 1046.5 * t)) * env
        return np.stack([mono * .96, mono], axis=1)
    env = np.exp(-5 * t)
    freq = 180 - 55 * np.clip(t / max(t[-1], 1e-6), 0, 1)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    mono = (.16 * np.sin(phase) + .045 * np.sin(phase * 2)) * env
    return np.stack([mono, mono * .94], axis=1)


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=True, text=True, capture_output=True)


def encode(wav_path: Path, opus_path: Path, bitrate: str = "64k") -> None:
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path), "-af", "loudnorm=I=-18:LRA=6:TP=-1.5", "-ar", str(SR), "-ac", "2", "-c:a", "libopus", "-b:a", bitrate, "-vbr", "on", "-application", "audio", str(opus_path)])


def inspect(path: Path) -> dict:
    probe = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,channels,sample_rate", "-of", "json", str(path)]).stdout)
    measured = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "loudnorm=I=-18:LRA=6:TP=-1.5:print_format=json", "-f", "null", "-"], text=True, capture_output=True, check=True).stderr
    blocks = re.findall(r"\{[\s\S]*?\}", measured)
    loud = json.loads(blocks[-1]) if blocks else {}
    payload = path.read_bytes()
    return {
        "path": "/assets/urai/generated/audio/" + path.name,
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "durationSeconds": round(float(probe["format"]["duration"]), 4),
        "codec": probe["streams"][0]["codec_name"],
        "channels": int(probe["streams"][0]["channels"]),
        "sampleRate": int(probe["streams"][0]["sample_rate"]),
        "integratedLufs": float(loud.get("input_i", 0)),
        "truePeakDbtp": float(loud.get("input_tp", 0)),
    }


def main() -> None:
    records = []
    with tempfile.TemporaryDirectory(prefix="urai-audio-") as tmp:
        tmpdir = Path(tmp)
        for name, spec in AMBIENT.items():
            wav_path = tmpdir / f"{name}.wav"
            opus_path = OUT / f"{name}.opus"
            make_ambient(name, spec, wav_path)
            encode(wav_path, opus_path)
            record = inspect(opus_path)
            record.update({"id": name, "role": "ambient", "loop": True, "caption": CAPTIONS[name], "maxBytes": MAX_BYTES[name]})
            records.append(record)
        for name, seconds, bitrate in [("portal-transition-v1", 2.6, "64k"), ("orb-confirm-v1", .9, "64k"), ("ui-error-v1", .72, "48k")]:
            wav_path = tmpdir / f"{name}.wav"
            opus_path = OUT / f"{name}.opus"
            write_wav(wav_path, np.tanh(cue_samples(name, seconds)) * .7)
            encode(wav_path, opus_path, bitrate)
            record = inspect(opus_path)
            record.update({"id": name, "role": "transition" if name.startswith("portal") else "ui", "loop": False, "caption": CAPTIONS[name], "maxBytes": MAX_BYTES[name]})
            records.append(record)

    failures = []
    for record in records:
        if record["codec"] != "opus" or record["channels"] != 2 or record["sampleRate"] != SR:
            failures.append(f"codec contract failed: {record['id']}")
        if record["bytes"] > record["maxBytes"]:
            failures.append(f"size budget failed: {record['id']}")
        if record["integratedLufs"] > -16:
            failures.append(f"loudness ceiling failed: {record['id']} ({record['integratedLufs']})")
        if record["truePeakDbtp"] > -1:
            failures.append(f"true peak ceiling failed: {record['id']} ({record['truePeakDbtp']})")
        if record["role"] == "ambient" and record["durationSeconds"] < 59:
            failures.append(f"ambient duration failed: {record['id']} ({record['durationSeconds']})")
    if failures:
        raise SystemExit("\n".join(failures))

    receipt = {
        "schemaVersion": "urai-spatial-production-audio-1",
        "status": "production-integrated-candidate",
        "generatedAt": os.environ.get("GITHUB_RUN_ID", "local"),
        "sourceHead": os.environ.get("GITHUB_SHA", "local"),
        "owner": "URAI Labs",
        "provenance": "Deterministic URAI production sound forge; original procedural synthesis; no third-party sampled media.",
        "license": "URAI Labs internal production asset",
        "policy": {
            "autoplay": False,
            "mutedByDefaultUntilConsent": True,
            "essentialInformationMayDependOnAudio": False,
            "captionMetadataRequired": True,
            "maxIntegratedLufs": -16,
            "truePeakDbtp": -1,
            "format": "opus",
        },
        "assets": records,
        "historicalEightSecondProofBedPromoted": False,
        "verification": {"passed": True, "failures": failures},
    }
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"ok": True, "assets": len(records), "receipt": str(RECEIPT.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
