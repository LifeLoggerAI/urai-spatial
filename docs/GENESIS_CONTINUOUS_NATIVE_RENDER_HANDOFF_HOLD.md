# UrAi Genesis D01 - continuous native capture to private film - HOLD

**Execution status:** Native capture 0/7; no native film exists. Original compiled consumer source is verified, but GitHub Actions has not assigned a runner. This document is not a publication approval.

## Why the new adapter exists

The historical media promotion program `promote_verified_native_clips.py` in the preserved source handoff expects independent-route `native_capture_receipt.json` data with `ground` and `orb-close` segments. The source-bound continuous recorder now committed in Spatial draft PR #1850 instead produces `continuous-motion-receipt.json` and seven *encrypted* WebM clips named `home`, `orb`, `ascent`, `life-map`, `focus`, `replay`, `return`. Its continuous proof demands genuine sky ascent, explicit sample selection, original Replay activation, and reverse navigation. The historical program correctly refuses those mismatched inputs and must not be weakened. This additive script handles the new source format without rewriting the old one.

## Private renderer command (ONLY after genuine capture)

Run in an authorized **private** workstation or other expressly approved non-public environment. Never give the private key to GitHub Actions or include it in a public Actions artifact. Never run from the static screenshots.

```bash
python3 scripts/render-verified-canonical-native-hold.py \
  --receipt /PRIVATE/continuous-motion-receipt.json \
  --seals /PRIVATE/sealed-original-app-motion \
  --editorial-zip /PRIVATE/URAI_GENESIS_D01_THE_WORLD_OPENS_REPLACEMENT_HOLD_20261101.zip \
  --check-only

python3 scripts/render-verified-canonical-native-hold.py \
  --receipt /PRIVATE/continuous-motion-receipt.json \
  --seals /PRIVATE/sealed-original-app-motion \
  --editorial-zip /PRIVATE/URAI_GENESIS_D01_THE_WORLD_OPENS_REPLACEMENT_HOLD_20261101.zip \
  --private-key /PRIVATE/owner-held-ephemeral-recovery-key.pem \
  --output /PRIVATE/urai-genesis-D01-HOLD
```

Requirements: Python >=3.11; `cryptography`, Pillow, FFmpeg with H.264 and FFprobe; DejaVuSans-compatible local typography. Do not redistribute fonts. Captured `.sealed` files must all match actual cryptographic hashes in the source receipt and decrypt under the owner-held key. The renderer refuses non-continuous captures, proof failures, mismatched source identity, altered seals, short clips, static footage, or missing editorial bytes.

## Original editorial clock preserved

| Final edit | Source | Exact duration |
| --- | --- | ---: |
| 0:00-0:04 | Title-only neutral introductory card | 4 seconds |
| 0:04-0:08 | Original Home motion | 4 seconds |
| 0:08-0:12 | Real Home sky Ascent (not `/ascent/` redirect) | 4 seconds |
| 0:12-0:17 | Original LifeMap motion | 5 seconds |
| 0:17-0:20 | Original Focus motion | 3 seconds |
| 0:20-0:23 | Original Replay motion | 3 seconds |
| 0:23-0:27 | Actual Replay-to-Home return segment | 4 seconds |
| 0:27-0:30 | Real Orb close, recorded on returned Home | 3 seconds |

This edit reorders the final Orb segment for editorial pacing but does not claim the Orb originally occurred before Ascent. The existing synthetic offline review narration and SRT/VTT are reused as unapproved drafts only. Distinct rights, claims, accessibility, creative, independent-review and founder acceptance are still HOLD.

## Source, inspection, and custody

- Consumer source: `94c8a2cf68a436a0c49e80b3a09578935df12d48`, GitHub artifact `12145312224`.
- Compiled ZIP SHA-256: `241902126b0f3a73e0a26b59e303bfc8d90289a008e9b3d4e2f238518f284fbe`.
- Historical editorial review ZIP SHA-256: `ae91dd2273a08b627f564e3907a04369481dcc1af9ccf22c3e149de75b5b3f94`.
- Native recording must come from the exact original source; live revision `748e50398d85effeaa4ed17aaf78d4076dddbb45` cannot be substituted.
- Input RSA-OAEP-SHA256/AES-256-GCM transport is verified independently, and each decrypted WebM is hashed again and decoded for real motion.
- Final MP4 must decode fully as H.264, 1080x1920, 24fps, AAC, 720 frames and 30 seconds.
- The private package includes new cover from a genuine Home video frame, review MP4, original caption drafts, seven source WebMs, provenance/HOLD ledger and SHA256SUMS covering every file.
- Package destination: **URAI Genesis Media - Internal HOLD** (Drive folder ID `1uJEw3P5qQXfEVzf_ZWziEC4EugChBou4`), only after verifying private access and upload bytes.
- **Do not upload decrypted video or the owner private key into this public repository.**

## Reproducibility and fail-closed testing

```bash
python3 -m unittest discover -s tests -p 'test_verified_canonical_native_hold.py' -v
python3 -m py_compile scripts/render-verified-canonical-native-hold.py
```

Local tests use nonmedia cryptographic fixtures, not fake UrAi footage. Historical editorial sample can be used solely to validate FFprobe/inspector parsing, never presented as native film.

**Until hosted WebGL recording and all seven clips physically exist and pass inspection: film complete = FALSE.**

## Exact editorial footage-length and privacy gate (2026-11-01)

The previous recorder admitted intervals shorter than the preserved cut needs (2.5 seconds for a 4-second Home shot and 2.5 for a 5-second LifeMap shot). The repaired source contract demands home >=4s, orb >=3s, ascent >=4s, life-map >=5s, focus >=3s, replay >=3s, return >=4s of genuine motion from one continuous browser journey. It increases actual scene hold time, not looping, still-frame repetition, or synthetic padding. Insufficient source duration blocks rendering.

The private renderer refuses to output decrypted video anywhere beneath the public source checkout **or any other Git checkout**, including linked worktrees. Explicitly specify an authorized private output directory outside the repo. Never commit plaintext WebMs, recovery keys, or private MP4 masters to a public branch.

Hosted WebGL capture remains blocked by GitHub runner admission. The new gates are locally tested only.
