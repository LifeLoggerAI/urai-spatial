#!/usr/bin/env python3
"""Fail-closed, PRIVATE ONLY native UrAi Genesis renderer.

Inputs must be seven *genuinely recorded* encrypted WebM clips plus the exact
continuous-journey receipt from scripts/genesis-original-canonical-motion-hold.mjs.
This does not capture scenes, grant consent, publish, or approve media.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone

ORIGINAL_SOURCE_SHA = '94c8a2cf68a436a0c49e80b3a09578935df12d48'
ORIGINAL_ARTIFACT = 12145312224
EDITORIAL_SHA256 = 'ae91dd2273a08b627f564e3907a04369481dcc1af9ccf22c3e149de75b5b3f94'
SOURCE_RECEIPT_SCHEMA = 'urai-genesis-original-continuous-motion-hold/v1'
SEAL_FORMAT = 'URAI_GENESIS_HOLD_RSA_OAEP_SHA256_AES_256_GCM_V1'
# Preserve the original 00:00-00:30 editorial clock. Native Orb comes from
# the recorded RETURN to Home; it is not falsely presented as pre-Ascent.
CUTS = (
    ('intro', None, 4),
    ('home', 'home', 4),
    ('ascent', 'ascent', 4),
    ('life-map', 'life-map', 5),
    ('focus', 'focus', 3),
    ('replay', 'replay', 3),
    ('return', 'return', 4),
    ('orb', 'orb', 3),
)
EXPECTED_NAMES = {'home', 'orb', 'ascent', 'life-map', 'focus', 'replay', 'return'}
EXPECTED_INTERVALS = {
    'home': ('home', 'home-first-person'),
    'orb': ('return-home', 'orb-end'),
    'ascent': ('home-first-person', 'life-map-overview'),
    'life-map': ('life-map-overview', 'focus'),
    'focus': ('focus', 'replay'),
    'replay': ('replay', 'replay-playback-end'),
    'return': ('replay-playback-end', 'return-home'),
}
assert sum(duration for _, _, duration in CUTS) == 30
# The original recorder enforces a 250 ms motion margin over each final edit.
SOURCE_CAPTURE_MARGIN_SECONDS = 0.25
EDIT_SECONDS = {source: seconds for _, source, seconds in CUTS if source is not None}
# Bound all externally supplied media sizes *before* whole-file reads/decryption.
MAX_NATIVE_SOURCE_BYTES = 256 * 1024 * 1024
MAX_ENCRYPTED_CLIP_BYTES = MAX_NATIVE_SOURCE_BYTES + 16 * 1024


class HoldRefusal(RuntimeError):
    pass


def require(condition: bool, reason: str):
    if not condition:
        raise HoldRefusal(reason)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_sha256(file: Path) -> str:
    digest = hashlib.sha256()
    with file.open('rb') as f:
        while chunk := f.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def verify_private_output_destination(output: Path):
    resolved = output.resolve()
    repository_root = Path(__file__).resolve().parents[1]
    require(not resolved.is_relative_to(repository_root), 'DECRYPTED_VIDEO_OUTPUT_CANNOT_BE_INSIDE_PUBLIC_REPOSITORY')
    # Also reject a different Git checkout or linked worktree. A private render
    # must never accidentally put plaintext recordings into ANY source repository.
    for parent in (resolved, *resolved.parents):
        require(not (parent / '.git').exists(), 'DECRYPTED_VIDEO_OUTPUT_CANNOT_BE_INSIDE_GIT_CHECKOUT')


def safe_basename(name: str) -> bool:
    return isinstance(name, str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,180}', name) is not None and Path(name).name == name


def hexhash(value) -> bool:
    return isinstance(value, str) and re.fullmatch(r'[0-9a-f]{64}', value) is not None


def finite_number(value) -> bool:
    return type(value) in (int, float) and math.isfinite(value)


def bounded_positive_int(value, ceiling) -> bool:
    return type(value) is int and 0 < value <= ceiling



def inspect_ascent_decoded_grayscale(decoded: bytes, width=128, height=72) -> dict:
    """Verify sustained interior decoded pixel movement, not a UI counter or cut."""
    require(isinstance(decoded, bytes) and type(width) is int and type(height) is int
            and 8 <= width and 8 <= height and width * height <= 100000
            and len(decoded) % (width * height) == 0, 'ASCENT_RASTER_DECODED_BYTES_INVALID')
    pixels = width * height
    frames = len(decoded) // pixels
    require(frames >= 12, 'ASCENT_RASTER_FRAMES_INSUFFICIENT')
    edge = max(2, int(frames * .20))
    pairs = []
    for index in range(edge + 1, frames - edge):
        a, b = (index - 1) * pixels, index * pixels
        changed, delta_sum = 0, 0
        for j in range(pixels):
            delta = abs(decoded[a + j] - decoded[b + j])
            delta_sum += delta
            if delta >= 10:
                changed += 1
        mean = delta_sum / pixels
        fraction = changed / pixels
        pairs.append((mean, mean >= 1.2 and fraction >= .04))
    require(len(pairs) >= 6, 'ASCENT_INTERIOR_RASTER_INTERVAL_TOO_SHORT')
    split = len(pairs) // 2
    first = sum(1 for _, strong in pairs[:split] if strong)
    second = sum(1 for _, strong in pairs[split:] if strong)
    return {
        'verified': first >= 3 and second >= 3 and first + second >= 6,
        'sampleMethod': 'decoded_original_webm_center_crop_grayscale_4fps',
        'frames': frames, 'interiorPairs': len(pairs), 'strongPairs': first + second,
        'firstHalfStrongPairs': first, 'secondHalfStrongPairs': second,
        'interiorMeanDelta': round(sum(mean for mean, _ in pairs) / len(pairs), 3),
    }


def verify_ascent_video_raster(video: Path) -> dict:
    """Independently repeat the capture-side raster proof on decrypted WebM."""
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(video),
           '-vf', 'fps=4,crop=iw*0.70:ih*0.70,scale=128:72:flags=area,format=gray',
           '-an', '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1']
    r = subprocess.run(cmd, capture_output=True, timeout=90)
    require(r.returncode == 0, 'DECRYPTED_ASCENT_RASTER_FFMPEG_FAILED')
    evidence = inspect_ascent_decoded_grayscale(r.stdout)
    require(evidence['verified'], 'DECRYPTED_ASCENT_INTERIOR_RASTER_MOTION_UNPROVEN')
    return evidence

def validate_receipt(record: dict) -> dict[str, dict]:
    require(isinstance(record, dict), 'INVALID_CONTINUOUS_CAPTURE_RECEIPT')
    require(record.get('schema') == SOURCE_RECEIPT_SCHEMA, 'CONTINUOUS_RECEIPT_SCHEMA_MISMATCH')
    origin = record.get('source') or {}
    require(origin.get('repository') == 'LifeLoggerAI/urai-spatial' and origin.get('commit') == ORIGINAL_SOURCE_SHA and origin.get('artifactId') == ORIGINAL_ARTIFACT, 'ORIGINAL_CAPTURE_SOURCE_MISMATCH')
    require(record.get('fixture') == 'EXPLICIT_DISCLOSED_DEMO_QUIET_RESET_NO_PERSONAL_ACCOUNT', 'DISCLOSED_SAMPLE_IDENTITY_REQUIRED')
    require(record.get('release') == 'NO-GO/HOLD' and record.get('publicPublishing') == 'HOLD' and record.get('privateMedia') == 'DISABLED' and record.get('nativeDispatch') == 'DISABLED', 'RELEASE_HOLD_CONTRACT_BROKEN')
    proof = record.get('evidence') or {}
    original = proof.get('originalCanonicalProof') or {}
    require(proof.get('continuousJourney') is True and proof.get('realAscent') is True, 'CONTINUOUS_REAL_ASCENT_NOT_PROVEN')
    raster = proof.get('ascentRasterMotion') or {}
    require(isinstance(raster, dict) and raster.get('verified') is True and raster.get('sampleMethod') == 'decoded_original_webm_center_crop_grayscale_4fps'
            and type(raster.get('frames')) is int and raster['frames'] >= 12
            and type(raster.get('strongPairs')) is int and raster['strongPairs'] >= 6
            and type(raster.get('firstHalfStrongPairs')) is int and raster['firstHalfStrongPairs'] >= 3
            and type(raster.get('secondHalfStrongPairs')) is int and raster['secondHalfStrongPairs'] >= 3,
            'CAPTURE_ASCENT_RASTER_MOTION_NOT_PROVEN')
    require(original.get('status') == 'passed' and original.get('desktopPassed') is True and original.get('ascentProven') is True and original.get('identityStable') is True, 'ORIGINAL_CANONICAL_PROOF_NOT_PASSED')
    require(proof.get('exactCompiledSourceVerified') is True and hexhash(proof.get('continuousRawVideo', {}).get('videoSha256')), 'EXACT_COMPILED_SOURCE_OR_REAL_VIDEO_UNVERIFIED')
    require(record.get('complete') is True and record.get('nativeClipsCaptured') == 7 and record.get('errors') == [], 'NATIVE_CAPTURE_INCOMPLETE_OR_ERRORS')
    clips = record.get('clips')
    require(isinstance(clips, list) and len(clips) == 7, 'SEVEN_GENUINE_CAPTURE_CLIPS_REQUIRED')
    by_name = {clip.get('name'): clip for clip in clips if isinstance(clip, dict)}
    require(set(by_name) == EXPECTED_NAMES, 'CANONICAL_CLIP_IDENTITIES_INCOMPLETE')
    require(len(by_name) == len(clips), 'DUPLICATE_CLIP_IDENTITY')
    timeline = record.get('timeline')
    require(isinstance(timeline, list) and 13 <= len(timeline) <= 200, 'CANONICAL_TIMELINE_MISSING')
    milestones = {}
    prev_ms = -1
    for e in timeline:
        require(isinstance(e, dict) and isinstance(e.get('id'), str) and finite_number(e.get('ms')) and 0 <= e['ms'] <= 3600000 and e['ms'] >= prev_ms and e['id'] not in milestones, 'NONMONOTONIC_OR_DUPLICATE_JOURNEY_EVENT')
        milestones[e['id']] = e['ms'] / 1000.0
        prev_ms = e['ms']
    for name, clip in by_name.items():
        begin, end = EXPECTED_INTERVALS[name]
        require(begin in milestones and end in milestones and milestones[end] > milestones[begin], 'SOURCE_INTERVAL_OR_ROUTE_MISSING:' + name)
        require(clip.get('sourceCheckpointStart') == begin and clip.get('sourceCheckpointEnd') == end, 'CLIP_ORIGIN_EVENT_MISMATCH:' + name)
        start, end_seconds = clip.get('sourceStartSeconds'), clip.get('sourceEndSeconds')
        declared_seconds, encoded_seconds = clip.get('sourceDurationSeconds'), clip.get('durationSeconds')
        require(all(finite_number(v) for v in (start, end_seconds, declared_seconds, encoded_seconds)), 'MALFORMED_SOURCE_CLIP_TIMESTAMPS:' + name)
        require(abs(start - milestones[begin]) < 0.02 and abs(end_seconds - milestones[end]) < 0.02, 'CLIP_TIMELINE_MISMATCH:' + name)
        true_interval = milestones[end] - milestones[begin]
        require(abs(declared_seconds - true_interval) <= 0.02 and declared_seconds > 0, 'DECLARED_CLIP_DURATION_MISMATCH:' + name)
        required = EDIT_SECONDS[name]
        require(true_interval >= required + SOURCE_CAPTURE_MARGIN_SECONDS - 0.02, 'INSUFFICIENT_SOURCE_JOURNEY_FOR_EDIT:' + name)
        require(encoded_seconds >= required - 0.02 and encoded_seconds <= declared_seconds + 0.35, 'ENCODED_CLIP_TOO_SHORT_OR_MISMATCHED:' + name)
        require(bounded_positive_int(clip.get('sourceBytes'), MAX_NATIVE_SOURCE_BYTES) and clip['sourceBytes'] > 8192 and hexhash(clip.get('sourceSha256')), 'CLIP_SOURCE_BYTES_NOT_VERIFIED:' + name)
        require(clip.get('codec') == 'vp9', 'NATIVE_CAPTURE_CODEC_UNEXPECTED:' + name)
        motion = clip.get('motion') or {}
        require(isinstance(motion, dict) and type(motion.get('sampledFrames')) is int and type(motion.get('uniqueFrames')) is int and 4 <= motion['uniqueFrames'] <= motion['sampledFrames'], 'GENUINE_FRAME_MOTION_NOT_PROVEN:' + name)
        seal = clip.get('encryption') or {}
        require(isinstance(seal, dict) and safe_basename(seal.get('sealedFile')) and seal['sealedFile'] == name + '.sealed' and hexhash(seal.get('sealedSha256')) and bounded_positive_int(seal.get('sealedBytes'), MAX_ENCRYPTED_CLIP_BYTES) and seal['sealedBytes'] > clip['sourceBytes'], 'CLIP_ENCRYPTION_RECEIPT_INVALID:' + name)
    return by_name


def verify_editorial_zip(file: Path):
    require(file.is_file() and file_sha256(file) == EDITORIAL_SHA256, 'ORIGINAL_EDITORIAL_ZIP_HASH_MISMATCH')
    with zipfile.ZipFile(file) as z:
        names = z.namelist()
        def get_once(suffix):
            selected = [n for n in names if n.endswith(suffix)]
            require(len(selected) == 1, 'PRESERVED_EDITORIAL_MEMBER_MISSING:' + suffix)
            return z.read(selected[0])
        return {
            'narration.wav': get_once('GENESIS-D01_narration_OFFLINE_SYNTH_REVIEW_ONLY.wav'),
            'captions.srt': get_once('GENESIS-D01_en_review_draft.srt'),
            'captions.vtt': get_once('GENESIS-D01_en_review_draft.vtt'),
        }


def verified_seal(clip: dict, sealed_dir: Path) -> tuple[bytes, dict]:
    name = clip['encryption']['sealedFile']
    sealed_path = sealed_dir / name
    require(sealed_path.is_file() and sealed_path.is_symlink() is False, 'ENCRYPTED_CLIP_MISSING:' + name)
    # Stat the bytes first; do not let a forged receipt trigger an unbounded read.
    stored_bytes = sealed_path.stat().st_size
    declared_bytes = clip['encryption']['sealedBytes']
    require(bounded_positive_int(declared_bytes, MAX_ENCRYPTED_CLIP_BYTES) and stored_bytes <= MAX_ENCRYPTED_CLIP_BYTES, 'ENCRYPTED_CLIP_EXCEEDS_SIZE_LIMIT:' + name)
    require(stored_bytes == declared_bytes, 'ENCRYPTED_CLIP_SHA256_MISMATCH:' + name)
    sealed = sealed_path.read_bytes()
    require(len(sealed) == declared_bytes and sha256(sealed) == clip['encryption']['sealedSha256'], 'ENCRYPTED_CLIP_SHA256_MISMATCH:' + name)
    header_end = sealed.find(b'\n')
    require(20 <= header_end <= 8192, 'SEALED_HEADER_INVALID:' + name)
    header = json.loads(sealed[:header_end].decode('utf8'))
    require(isinstance(header, dict), 'SEALED_HEADER_INVALID:' + name)
    require(header.get('format') == SEAL_FORMAT and header.get('originalSha256') == clip['sourceSha256'] and header.get('originalBytes') == clip['sourceBytes'], 'SEALED_ORIGINAL_IDENTITY_MISMATCH:' + name)
    require(len(sealed) - header_end - 1 == clip['sourceBytes'], 'SEALED_CIPHERTEXT_LENGTH_MISMATCH:' + name)
    return sealed[header_end+1:], header


def decrypt_seal(ciphertext: bytes, header: dict, private_key) -> bytes:
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    import base64
    key = private_key.decrypt(base64.b64decode(header['encryptedKey'], validate=True), padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    require(len(key) == 32, 'SEALED_AES_KEY_INVALID')
    nonce = base64.b64decode(header['nonce'], validate=True)
    tag = base64.b64decode(header['tag'], validate=True)
    require(len(nonce) == 12 and len(tag) == 16, 'SEALED_AES_GCM_NONCE_OR_TAG_INVALID')
    plaintext = AESGCM(key).decrypt(nonce, ciphertext + tag, None)
    require(len(plaintext) == header['originalBytes'] and sha256(plaintext) == header['originalSha256'], 'DECRYPTED_NATIVE_SOURCE_HASH_MISMATCH')
    return plaintext


def ffprobe(file: Path) -> dict:
    result = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames', '-of', 'json', str(file)], capture_output=True, text=True, timeout=30)
    require(result.returncode == 0, 'MEDIA_FFPROBE_FAILURE:' + file.name)
    return json.loads(result.stdout)


def motion(file: Path) -> dict:
    result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(file), '-vf', 'fps=2,scale=128:128', '-f', 'framemd5', '-'], capture_output=True, text=True, timeout=90)
    require(result.returncode == 0, 'NATIVE_MOTION_DECODE_FAILED:' + file.name)
    hashes = [line.split(',')[-1].strip() for line in result.stdout.splitlines() if line and not line.startswith('#')]
    require(len(hashes) >= 4 and len(set(hashes)) >= 4, 'NATIVE_MOVING_FRAMES_UNVERIFIED:' + file.name)
    return {'sampledFrames': len(hashes), 'uniqueFrames': len(set(hashes))}


def render_title(p: Path):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new('RGB', (1080, 1920), (6, 12, 24))
    d = ImageDraw.Draw(im)
    ttf = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    require(Path(ttf).is_file(), 'LOCAL_PRIVATE_RENDER_FONT_UNAVAILABLE')
    for xy, text, size, color in [((90, 240), 'URAI GENESIS', 45, (208, 178, 127)), ((90, 660), 'THE WORLD', 86, (241, 246, 249)), ((90, 770), 'OPENS', 108, (241, 246, 249)), ((90, 1730), 'DESIGN PREVIEW / SAMPLE DATA', 27, (232, 222, 206)), ((90, 1790), 'INTERNAL HOLD / NOT APPROVED', 23, (166, 182, 202))]:
        d.text(xy, text, font=ImageFont.truetype(ttf, size), fill=color)
    im.save(p)


def run_ffmpeg(args: list[str], timeout=240):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], capture_output=True, text=True, timeout=timeout)
    require(r.returncode == 0, 'FFMPEG_RENDER_ERROR:' + r.stderr[-1200:])


def validate_master(file: Path) -> dict:
    info = ffprobe(file)
    v = next((s for s in info.get('streams', []) if s.get('codec_type') == 'video'), {})
    a = next((s for s in info.get('streams', []) if s.get('codec_type') == 'audio'), {})
    fps = v.get('avg_frame_rate')
    require(v.get('codec_name') == 'h264' and v.get('width') == 1080 and v.get('height') == 1920 and fps == '24/1' and v.get('nb_read_frames') == '720', 'FINAL_MASTER_CODEC_RESOLUTION_FPS_OR_FRAMECOUNT_FAILED')
    require(a.get('codec_name') == 'aac', 'FINAL_MASTER_AAC_AUDIO_MISSING')
    duration = float(info.get('format', {}).get('duration', 0))
    require(abs(duration - 30.0) < 0.06, 'FINAL_MASTER_30_SECOND_DURATION_FAILED')
    dec = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(file), '-f', 'null', '-'], capture_output=True, timeout=90)
    require(dec.returncode == 0, 'FINAL_MASTER_FULL_DECODE_FAILED')
    return {'durationSeconds': duration, 'frameCount': 720, 'resolution': [1080, 1920], 'fps': '24/1', 'videoCodec': 'h264', 'audioCodec': 'aac'}



def inspect_review_metadata(info: dict) -> dict:
    """Validate the actual lightweight review encoding, not only its dimensions."""
    v = next((s for s in info.get('streams', []) if s.get('codec_type') == 'video'), {})
    a = next((s for s in info.get('streams', []) if s.get('codec_type') == 'audio'), {})
    require(v.get('codec_name') == 'h264' and v.get('width') == 540 and v.get('height') == 960
            and v.get('avg_frame_rate') == '24/1' and v.get('nb_read_frames') == '720',
            'REVIEW_COPY_CODEC_RESOLUTION_FPS_OR_FRAMECOUNT_FAILED')
    require(a.get('codec_name') == 'aac', 'REVIEW_COPY_AAC_AUDIO_MISSING')
    duration = info.get('format', {}).get('duration')
    try:
        duration = float(duration)
    except (ValueError, TypeError, OverflowError):
        raise HoldRefusal('REVIEW_COPY_30_SECOND_DURATION_FAILED') from None
    require(math.isfinite(duration) and abs(duration - 30.0) < 0.06, 'REVIEW_COPY_30_SECOND_DURATION_FAILED')
    return {'durationSeconds': duration, 'frameCount': 720, 'resolution': [540, 960],
            'fps': '24/1', 'videoCodec': 'h264', 'audioCodec': 'aac'}


def validate_review(file: Path) -> dict:
    details = inspect_review_metadata(ffprobe(file))
    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(file), '-f', 'null', '-'],
                             capture_output=True, timeout=90)
    require(decoded.returncode == 0, 'REVIEW_COPY_FULL_DECODE_FAILED')
    return details


def validate_cover(file: Path):
    from PIL import Image
    try:
        with Image.open(file) as im:
            require(im.format == 'PNG' and im.size == (1080, 1920) and im.mode in ('RGB', 'RGBA'),
                    'NATIVE_COVER_FORMAT_OR_DIMENSIONS_FAILED')
            im.verify()
    except (OSError, SyntaxError) as e:
        raise HoldRefusal('NATIVE_COVER_DECODE_FAILED:' + str(e)) from e




# Generate private, standalone provenance and reproducibility documents only
# after a real native master has passed physical media inspection. No keys.
ORIGINAL_ARCHIVE_SHA256 = '241902126b0f3a73e0a26b59e303bfc8d90289a008e9b3d4e2f238518f284fbe'


def private_reproducibility_receipts(output: Path, capture: dict, capture_receipt: Path) -> tuple[Path, Path]:
    require(capture.get('complete') is True, 'NATIVE_CAPTURE_INCOMPLETE_FOR_PACKAGE_MANIFEST')
    require(len(capture.get('clips') or []) == 7, 'SEVEN_NATIVE_CLIPS_REQUIRED_FOR_PACKAGE_MANIFEST')
    manifest = {
        'schema': 'urai-genesis-D01-original-native-source-manifest-hold/v1',
        'generatedAtUtc': datetime.now(timezone.utc).isoformat(),
        'originalCompiledApplication': {
            'repository': 'LifeLoggerAI/urai-spatial',
            'commit': ORIGINAL_SOURCE_SHA,
            'artifactId': ORIGINAL_ARTIFACT,
            'archiveSha256': ORIGINAL_ARCHIVE_SHA256,
        },
        'captureSourceReceiptSha256': file_sha256(capture_receipt),
        'renderImplementationSha256': file_sha256(Path(__file__).resolve()),
        'editorialArchiveSha256': EDITORIAL_SHA256,
        'sampleFixture': capture['fixture'],
        'captureEnvironment': capture.get('environment') or {},
        'sevenNativeClips': [
            {'name': clip['name'], 'sourceSha256': clip['sourceSha256'],
             'encryptedSha256': clip['encryption']['sealedSha256']}
            for clip in sorted(capture['clips'], key=lambda x: x['name'])
        ],
        'publicRelease': False, 'independentAcceptance': 'PENDING', 'status': 'PRIVATE_HOLD',
    }
    manifest_file = output / 'GENESIS_NATIVE_SOURCE_MANIFEST_HOLD.json'
    manifest_file.write_text(json.dumps(manifest, sort_keys=True, indent=2) + '\n', encoding='utf8')
    instructions = f'''# UrAi Genesis D01 - private native film reproduction (HOLD)

This document describes the verified-source workflow; it does not authorize
public publishing, private customer media, new infrastructure, or spending.
All scenes use the disclosed Quiet Reset sample fixture, not customer memories.

1. Retrieve original GitHub Actions artifact `{ORIGINAL_ARTIFACT}` from
   `LifeLoggerAI/urai-spatial`, original commit `{ORIGINAL_SOURCE_SHA}`.
   Verify the downloaded artifact SHA-256 exactly:
   `{ORIGINAL_ARCHIVE_SHA256}`. Unzip to a private `original` directory.
2. In the existing authorized, non-billable WebGL/Chromium environment, run
   `node scripts/genesis-original-canonical-motion-hold.mjs --original original --output PRIVATE_CAPTURE_DIR`
   with `URAI_GENESIS_HOLD_PUBLIC_KEY` supplied through approved local configuration.
   Ensure seven real-motion `.sealed` files and `continuous-motion-receipt.json` exist.
   Do not publish plaintext media, a recovery key, or failure screenshots.
3. With the separate preserved editorial ZIP, perform the safe check-only step:
   `python3 scripts/render-verified-canonical-native-hold.py --receipt PRIVATE_CAPTURE_DIR/continuous-motion-receipt.json --seals PRIVATE_CAPTURE_DIR --editorial-zip EDITORIAL.zip --output PRIVATE_OUTPUT_DIR --check-only`
4. Only after source, authorization, rights and custody checks are satisfied,
   run the same command without `--check-only` and with
   `--private-key OWNER_CONTROLLED_PRIVATE_KEY_PATH`. Keep the key outside source,
   CI, media ZIPs, and all logs. Never provide the key in chat.
5. Verify the new MP4, motion clips, audio, 720 frames, subtitles, safe areas,
   hashes and package integrity. Maintain independent creative/rights review.
6. Store the resulting ZIP in `URAI Genesis Media - Internal HOLD`, folder
   `1uJEw3P5qQXfEVzf_ZWziEC4EugChBou4`, then verify downloaded bytes and
   access restrictions. No public release without separate founder authorization.

Capture receipt SHA-256: `{manifest['captureSourceReceiptSha256']}`.
Render implementation SHA-256: `{manifest['renderImplementationSha256']}`.
Editorial archive SHA-256: `{EDITORIAL_SHA256}`.
Release status: NO-GO / HOLD.
'''
    instructions_file = output / 'GENESIS_NATIVE_CAPTURE_RENDER_INSTRUCTIONS_HOLD.md'
    instructions_file.write_text(instructions, encoding='utf8')
    return manifest_file, instructions_file

def build(args):
    sealed_dir = Path(args.seals).resolve()
    source_receipt_file = Path(args.receipt).resolve()
    with source_receipt_file.open('r', encoding='utf8') as f:
        original = json.load(f)
    clips = validate_receipt(original)
    editor = verify_editorial_zip(Path(args.editorial_zip).resolve())
    for clip in clips.values():
        verified_seal(clip, sealed_dir)
    if args.check_only:
        print(json.dumps({'status': 'CAPTURE_RECEIPT_AND_CIPHERTEXT_VALID', 'nativeClips': len(clips), 'source': ORIGINAL_SOURCE_SHA, 'filmCreated': False, 'publicRelease': False}, indent=2))
        return
    require(args.private_key is not None and Path(args.private_key).is_file(), 'OWNER_RECOVERY_KEY_REQUIRED_FOR_PRIVATE_RENDER')
    from cryptography.hazmat.primitives import serialization
    key = serialization.load_pem_private_key(Path(args.private_key).read_bytes(), password=None)
    output = Path(args.output).resolve()
    # Refuse unencrypted video under a public Git checkout.
    verify_private_output_destination(output)
    require(output != sealed_dir and output != source_receipt_file.parent, 'OUTPUT_MUST_BE_SEPARATE_PRIVATE_FOLDER')
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(output, 0o700)  # Only private local storage may hold decrypted motion.
    with tempfile.TemporaryDirectory(prefix='urai-native-private-') as td:
        tmp = Path(td)
        os.chmod(tmp, 0o700)
        decrypted = {}
        for name, clip in clips.items():
            ciphertext, header = verified_seal(clip, sealed_dir)
            plain = decrypt_seal(ciphertext, header, key)
            dest = tmp / (name + '.webm')
            with dest.open('xb') as f:
                os.fchmod(f.fileno(), 0o600)
                f.write(plain)
            del plain
            info = ffprobe(dest)
            v = next((s for s in info.get('streams', []) if s.get('codec_type') == 'video'), {})
            required_seconds = dict((n, sec) for n, source, sec in CUTS if source).get(name)
            actual_seconds = float(info.get('format', {}).get('duration', 0))
            require(v.get('codec_name') == 'vp9' and actual_seconds >= required_seconds - 0.02, 'INCOMPLETE_NATIVE_SOURCE_VIDEO:' + name)
            raster_motion = verify_ascent_video_raster(dest) if name == 'ascent' else None
            decrypted[name] = {'path': dest, 'sha256': clip['sourceSha256'], 'duration': actual_seconds, 'motion': motion(dest), 'ascentRasterMotion': raster_motion}
        title = tmp / 'opening-title.png'
        render_title(title)
        (tmp / 'narration.wav').write_bytes(editor['narration.wav'])
        captions_srt = output / 'GENESIS-D01_en_review_draft.srt'
        captions_vtt = output / 'GENESIS-D01_en_review_draft.vtt'
        captions_srt.write_bytes(editor['captions.srt'])
        captions_vtt.write_bytes(editor['captions.vtt'])
        segments = []
        for i, (name, source, secs) in enumerate(CUTS):
            seg = tmp / f'{i:02d}_{name}.mp4'
            if source is None:
                ffargs = ['-loop', '1', '-framerate', '24', '-i', str(title), '-t', str(secs)]
                visual = 'format=yuv420p'
            else:
                ffargs = ['-i', str(decrypted[source]['path']), '-t', str(secs)]
                visual = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,fps=24,setsar=1,format=yuv420p'
            run_ffmpeg([*ffargs, '-vf', visual, '-frames:v', str(24 * secs), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '24', '-an', str(seg)])
            segments.append(seg)
        order = tmp / 'concat.txt'
        order.write_text(''.join("file '" + str(f).replace("'", "'\\''") + "'\n" for f in segments), encoding='utf8')
        master = output / 'GENESIS-D01_THE_WORLD_OPENS_NATIVE_1080x1920_HOLD.mp4'
        run_ffmpeg(['-f', 'concat', '-safe', '0', '-i', str(order), '-i', str(tmp / 'narration.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-t', '30', '-movflags', '+faststart', str(master)])
        details = validate_master(master)
        home = decrypted['home']['path']
        image = tmp / 'native-home-frame.png'
        run_ffmpeg(['-ss', '0.7', '-i', str(home), '-frames:v', '1', str(image)])
        from PIL import Image, ImageDraw, ImageFont
        im = Image.open(image).convert('RGB')
        ratio = min(1080 / im.width, 1920 / im.height)
        scaled = im.resize((round(im.width * ratio), round(im.height * ratio)), Image.Resampling.LANCZOS)
        cover = Image.new('RGB', (1080, 1920), (6, 12, 24))
        cover.paste(scaled, ((1080 - scaled.width) // 2, (1920 - scaled.height) // 2))
        draw = ImageDraw.Draw(cover)
        draw.rectangle((0, 0, 1080, 270), fill=(6, 12, 24))
        draw.rectangle((0, 1680, 1080, 1920), fill=(6, 12, 24))
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 43)
        small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 23)
        draw.text((62, 80), 'URAI / THE WORLD OPENS', fill='white', font=font)
        draw.text((62, 1720), 'ORIGINAL APPLICATION / SAMPLE DATA', fill='white', font=small)
        draw.text((62, 1782), 'PRIVATE HOLD / NOT APPROVED', fill=(224, 183, 128), font=small)
        png = output / 'GENESIS-D01_THE_WORLD_OPENS_NATIVE_cover.png'
        cover.save(png, optimize=True)
        validate_cover(png)
        review = output / 'GENESIS-D01_THE_WORLD_OPENS_NATIVE_review_540x960.mp4'
        run_ffmpeg(['-i', str(master), '-vf', 'scale=540:960', '-c:v', 'libx264', '-preset', 'fast', '-crf', '26', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', str(review)])
        review_details = validate_review(review)
        ledger = {
            'schema': 'urai-genesis-D01-verified-continuous-native-render-hold/v1',
            'createdAtUtc': datetime.now(timezone.utc).isoformat(),
            'originalApplication': {'commit': ORIGINAL_SOURCE_SHA, 'artifactId': ORIGINAL_ARTIFACT},
            'captureContinuity': {'originalCanonicalProof': 'passed', 'recordedInOneBrowserPage': True, 'sevenSourceClipsVerified': True},
            'sourceMotion': [{'name': n, 'sourceSha256': c['sha256'], 'motion': c['motion'], 'ascentRasterMotion': c['ascentRasterMotion']} for n, c in decrypted.items()],
            'editTimeline': [{'name': name, 'source': source, 'seconds': secs} for name, source, secs in CUTS],
            'editorialZipSha256': EDITORIAL_SHA256,
            'master': {'name': master.name, 'sha256': file_sha256(master), **details},
            'cover': {'name': png.name, 'sha256': file_sha256(png)},
            'review': {'name': review.name, 'sha256': file_sha256(review), **review_details},
            'captions': {'srtSha256': file_sha256(captions_srt), 'vttSha256': file_sha256(captions_vtt), 'approval': 'DRAFT'},
            'audio': 'EXISTING_OFFLINE_SYNTH_INTERNAL_REVIEW_NOT_RIGHTS_APPROVED',
            'rightsApproved': False, 'claimsApproved': False, 'accessibilityApproved': False,
            'independentReviewApproved': False, 'founderApproval': False, 'publicPublishing': 'HOLD', 'release': 'NO-GO/HOLD',
        }
        receipt_file = output / 'NATIVE_MASTER_INSPECTION_AND_PROVENANCE_HOLD.json'
        receipt_file.write_text(json.dumps(ledger, indent=2) + '\n', encoding='utf8')
        manifest_file, instructions_file = private_reproducibility_receipts(output, original, source_receipt_file)
        exported = [master, png, review, captions_srt, captions_vtt, receipt_file, source_receipt_file,
                    manifest_file, instructions_file]
        for name, details in decrypted.items():
            # Authorized private package only: originals remain genuine WebM, not stills.
            target = output / (name + '.webm')
            shutil.copyfile(details['path'], target)
            require(file_sha256(target) == details['sha256'], 'POST_COPY_SOURCE_MOTION_HASH_MISMATCH:' + name)
            exported.append(target)
        checksum_file = output / 'SHA256SUMS.txt'
        checksum_file.write_text(''.join(f"{file_sha256(p)}  {('source_motion/' if p.suffix == '.webm' else '') + p.name}\n" for p in exported), encoding='utf8')
        exported.append(checksum_file)
        package = output / 'URAI_GENESIS_D01_NATIVE_PRODUCT_FILM_HOLD.zip'
        with zipfile.ZipFile(package, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=5) as z:
            for p in exported:
                z.write(p, arcname=('source_motion/' if p.suffix == '.webm' else '') + p.name)
        print(json.dumps({'state': 'PRIVATE_NATIVE_FILM_RENDERED_HOLD_NOT_RELEASE', 'master': str(master), 'package': str(package), 'sha256': file_sha256(package)}, indent=2))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--receipt', required=True)
    p.add_argument('--seals', required=True)
    p.add_argument('--editorial-zip', required=True)
    p.add_argument('--private-key')
    p.add_argument('--output', required=True, help='Authorized PRIVATE output directory outside any public source checkout')
    p.add_argument('--check-only', action='store_true')
    args = p.parse_args()
    try:
        build(args)
    except (HoldRefusal, KeyError, TypeError, ValueError, OSError, zipfile.BadZipFile, subprocess.TimeoutExpired) as e:
        print(json.dumps({'state': 'BLOCKED_INCOMPLETE', 'reason': str(e), 'nativeFilmCreated': False, 'release': 'HOLD'}))
        raise SystemExit(2)


if __name__ == '__main__':
    main()
