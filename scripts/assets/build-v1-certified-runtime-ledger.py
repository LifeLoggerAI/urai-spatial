#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[2]
RUNTIME_MANIFEST = ROOT / "urai-tier1/public/assets/urai/final/manifests/asset-factory-spatial-handoff.json"
EXPECTED_RECOVERY_ARTIFACT = 8742902079
EXPECTED_ORIGINAL_ARTIFACT = 8741010314
EXPECTED_RECOVERED_RECEPTIONIST_SHA256 = "d95bb0f4b2703e32b8cb2295dc42a2f900a9eaf749a48a3c7f334ab4edc29c05"
EXPECTED_RECEPTIONIST_REQUEST = "req_bb92582789134dbdb24e6f9f8c66c8ae"
EXPECTED_MANIFEST_SHA256 = "71591486803582a7468d375f05b341538c7fd5bd232bb330c16d6ce2ec5b155a"
MAX_RUNTIME_BYTES = 1_048_576
LOSSY_QUALITY = 95
MIN_COMPOSITE_PSNR_DB = 37.0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pixel_receipt(path: Path) -> tuple[str, int, int, bool]:
    with Image.open(path) as image:
        image.load()
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        digest = hashlib.sha256()
        digest.update(f"{rgba.width}x{rgba.height}:RGBA\n".encode())
        digest.update(rgba.tobytes())
        return digest.hexdigest(), rgba.width, rgba.height, alpha.getextrema() != (255, 255)


def alpha_sha256(path: Path) -> str:
    with Image.open(path) as image:
        image.load()
        alpha = image.convert("RGBA").getchannel("A")
        return hashlib.sha256(alpha.tobytes()).hexdigest()


def composite_psnr(source: Path, derivative: Path) -> float:
    with Image.open(source) as source_image, Image.open(derivative) as derivative_image:
        source_rgba = source_image.convert("RGBA")
        derivative_rgba = derivative_image.convert("RGBA")
        if source_rgba.size != derivative_rgba.size:
            raise ValueError("runtime derivative dimensions changed")
        scores: list[float] = []
        for level in (0, 255):
            background = Image.new("RGBA", source_rgba.size, (level, level, level, 255))
            source_composite = Image.alpha_composite(background, source_rgba).convert("RGB")
            derivative_composite = Image.alpha_composite(background, derivative_rgba).convert("RGB")
            difference = ImageChops.difference(source_composite, derivative_composite)
            statistic = ImageStat.Stat(difference)
            mean_squared_error = sum(statistic.sum2[:3]) / (source_rgba.width * source_rgba.height * 3)
            scores.append(99.0 if mean_squared_error == 0 else 10 * math.log10((255.0 ** 2) / mean_squared_error))
        return min(scores)


def encode_runtime_derivative(source: Path, destination: Path) -> dict[str, Any]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.load()
        rgba = image.convert("RGBA")
        rgba.save(destination, "WEBP", method=6, lossless=True, exact=True)
        encoding = "lossless-exact"
        quality: int | None = None
        if destination.stat().st_size > MAX_RUNTIME_BYTES:
            rgba.save(
                destination,
                "WEBP",
                method=6,
                lossless=False,
                quality=LOSSY_QUALITY,
                alpha_quality=100,
                exact=True,
            )
            encoding = "webp-q95"
            quality = LOSSY_QUALITY

    runtime_bytes = destination.stat().st_size
    if runtime_bytes > MAX_RUNTIME_BYTES:
        raise ValueError(f"runtime derivative exceeds {MAX_RUNTIME_BYTES} bytes: {runtime_bytes}")

    runtime_pixel_sha, width, height, has_alpha = pixel_receipt(destination)
    master_pixel_sha, master_width, master_height, master_has_alpha = pixel_receipt(source)
    if (width, height, has_alpha) != (master_width, master_height, master_has_alpha):
        raise ValueError("runtime derivative geometry or alpha mode changed")

    alpha_exact = alpha_sha256(source) == alpha_sha256(destination)
    if not alpha_exact:
        raise ValueError("runtime derivative alpha channel changed")

    fidelity = composite_psnr(source, destination)
    if encoding == "lossless-exact":
        if runtime_pixel_sha != master_pixel_sha:
            raise ValueError("lossless runtime derivative changed decoded pixels")
    elif fidelity < MIN_COMPOSITE_PSNR_DB:
        raise ValueError(
            f"lossy runtime derivative fidelity below {MIN_COMPOSITE_PSNR_DB:.1f} dB: {fidelity:.3f} dB"
        )

    return {
        "runtimeSha256": sha256(destination),
        "runtimePixelSha256": runtime_pixel_sha,
        "masterPixelSha256": master_pixel_sha,
        "width": width,
        "height": height,
        "hasAlpha": has_alpha,
        "runtimeBytes": runtime_bytes,
        "runtimeEncoding": encoding,
        "runtimeQuality": quality,
        "alphaExact": alpha_exact,
        "minCompositePsnrDb": round(fidelity, 6),
    }


def image_root(root: Path) -> Path:
    candidate = root / "image_asset_generator"
    if not candidate.is_dir():
        raise FileNotFoundError(f"artifact image_asset_generator root missing: {candidate}")
    return candidate


def metadata_details(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    details = payload.get("metadata")
    return details if isinstance(details, dict) else {}


def update_runtime_manifest(assets: list[dict[str, Any]]) -> None:
    if not RUNTIME_MANIFEST.is_file():
        raise FileNotFoundError(f"runtime manifest missing: {RUNTIME_MANIFEST}")
    manifest = json.loads(RUNTIME_MANIFEST.read_text(encoding="utf-8"))
    entries = manifest.get("assets")
    if not isinstance(entries, list) or len(entries) != 53:
        raise ValueError("runtime manifest must contain exactly 53 assets")
    by_name = {str(entry.get("name")): entry for entry in entries if isinstance(entry, dict)}
    if set(by_name) != {asset["n"] for asset in assets}:
        raise ValueError("runtime manifest identity set does not match certified V1 ledger")

    for asset in assets:
        entry = by_name[asset["n"]]
        entry.update({
            "status": "ready",
            "canonicalPath": asset["p"],
            "width": asset["w"],
            "height": asset["h"],
            "alpha": asset["a"],
            "sha256": asset["s"],
            "bytes": asset["runtimeBytes"],
            "runtimeDerivative": {
                "encoding": asset["runtimeEncoding"],
                "quality": asset["runtimeQuality"],
                "maxBytes": asset["runtimeMaxBytes"],
                "byteSha256": asset["s"],
                "pixelSha256": asset["x"],
                "masterSourceSha256": asset["srcSha256"],
                "masterPixelSha256": asset["masterPixelSha256"],
                "alphaExact": asset["alphaExact"],
                "minCompositePsnrDb": asset["minCompositePsnrDb"],
                "sourceArtifactId": EXPECTED_RECOVERY_ARTIFACT,
            },
        })

    manifest["runtimeDerivativeAuthority"] = {
        "sourceArtifactId": EXPECTED_RECOVERY_ARTIFACT,
        "sourceArtifactSha256": "d42a4549fd5ebd90a761ced87a72d6765de6bb56403055af5c9cec8bda6ed731",
        "sourceManifestSha256": EXPECTED_MANIFEST_SHA256,
        "maxSingleTextureBytes": MAX_RUNTIME_BYTES,
        "lossyQuality": LOSSY_QUALITY,
        "minCompositePsnrDb": MIN_COMPOSITE_PSNR_DB,
        "alphaChannelExact": True,
        "providerCalls": 0,
        "spendUsd": "0.00",
    }
    RUNTIME_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--original-root", required=True)
    parser.add_argument("--recovery-root", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    original = image_root(Path(args.original_root).resolve())
    recovery = image_root(Path(args.recovery_root).resolve())
    output = Path(args.output).resolve()

    manifest_path = recovery / "manifests/generated/v1.manifest.json"
    if sha256(manifest_path) != EXPECTED_MANIFEST_SHA256:
        raise ValueError("recovery V1 manifest hash mismatch")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(manifest, list) or len(manifest) != 53:
        raise ValueError("recovery V1 manifest must contain 53 entries")

    original_manifest = original / "manifests/generated/v1.manifest.json"
    if sha256(original_manifest) != EXPECTED_MANIFEST_SHA256:
        raise ValueError("original V1 manifest hash mismatch")

    assets: list[dict[str, Any]] = []
    unchanged = 0
    recovered_names: list[str] = []
    staging = output.parent / "v1-ledger-webp-staging"
    staging.mkdir(parents=True, exist_ok=True)

    for entry in manifest:
        name = str(entry["name"])
        sizes = [value for value in entry.get("sizes", []) if isinstance(value, int) and value > 0]
        template = str(entry.get("path_template", ""))
        canonical = str(entry.get("canonical_path", ""))
        if not sizes or "{size}" not in template:
            raise ValueError(f"{name}: invalid source template")
        if not canonical.startswith("assets/urai/") or not canonical.endswith(".webp"):
            raise ValueError(f"{name}: invalid canonical path")

        relative_source = Path(template.replace("{size}", str(max(sizes))))
        recovered_source = recovery / relative_source
        recovered_metadata = Path(f"{recovered_source}.render.json")
        original_source = original / relative_source
        original_metadata = Path(f"{original_source}.render.json")
        for required in (recovered_source, recovered_metadata):
            if not required.is_file():
                raise FileNotFoundError(f"{name}: missing recovery file {required}")

        if name == "avatar_receptionist":
            if sha256(recovered_source) != EXPECTED_RECOVERED_RECEPTIONIST_SHA256:
                raise ValueError("recovered receptionist source hash mismatch")
            recovered_names.append(name)
        else:
            if not original_source.is_file() or not original_metadata.is_file():
                raise FileNotFoundError(f"{name}: missing original retained files")
            if sha256(original_source) != sha256(recovered_source):
                raise ValueError(f"{name}: retained source changed")
            if sha256(original_metadata) != sha256(recovered_metadata):
                raise ValueError(f"{name}: retained metadata changed")
            unchanged += 1

        destination = staging / canonical
        derivative = encode_runtime_derivative(recovered_source, destination)

        details = metadata_details(recovered_metadata)
        request_id = details.get("provider_request_id")
        if not request_id:
            inherited = details.get("source_provider_request_ids")
            if not isinstance(inherited, list) or not inherited:
                raise ValueError(f"{name}: provider request provenance missing")
            request_id = "derived:" + ",".join(str(value) for value in inherited)
        if name == "avatar_receptionist" and request_id != EXPECTED_RECEPTIONIST_REQUEST:
            raise ValueError("recovered receptionist request ID mismatch")

        assets.append({
            "n": name,
            "p": canonical,
            "s": derivative["runtimeSha256"],
            "x": derivative["runtimePixelSha256"],
            "w": derivative["width"],
            "h": derivative["height"],
            "a": bool(entry.get("alpha")),
            "r": str(entry.get("renderer", "provider")),
            "q": str(request_id),
            "m": details.get("provider_model") or details.get("provider"),
            "src": relative_source.as_posix(),
            "srcSha256": sha256(recovered_source),
            "masterPixelSha256": derivative["masterPixelSha256"],
            "metadataSha256": sha256(recovered_metadata),
            "runtimeBytes": derivative["runtimeBytes"],
            "runtimeMaxBytes": MAX_RUNTIME_BYTES,
            "runtimeEncoding": derivative["runtimeEncoding"],
            "runtimeQuality": derivative["runtimeQuality"],
            "alphaExact": derivative["alphaExact"],
            "minCompositePsnrDb": derivative["minCompositePsnrDb"],
        })

    if unchanged != 52 or recovered_names != ["avatar_receptionist"]:
        raise ValueError(f"retained/recovered boundary mismatch: unchanged={unchanged}, recovered={recovered_names}")
    if len({asset["n"] for asset in assets}) != 53 or len({asset["p"] for asset in assets}) != 53:
        raise ValueError("V1 ledger names or paths are not unique")
    if any(asset["runtimeBytes"] > MAX_RUNTIME_BYTES for asset in assets):
        raise ValueError("V1 runtime derivative budget violation")

    lossless_count = sum(asset["runtimeEncoding"] == "lossless-exact" for asset in assets)
    lossy_count = sum(asset["runtimeEncoding"] == "webp-q95" for asset in assets)
    if lossless_count + lossy_count != 53:
        raise ValueError("V1 runtime derivative encoding count mismatch")

    ledger = {
        "schemaVersion": "1.2.0",
        "authority": {
            "consumer": "LifeLoggerAI/urai-spatial",
            "expectedOutputs": 53,
            "missing": 0,
            "pixelVerified": 53,
            "producer": "LifeLoggerAI/asset-factory",
            "providerCallsDuringRecertification": 0,
            "ready": 53,
            "runtimeBudgetBytes": MAX_RUNTIME_BYTES,
            "runtimeDerivativePolicy": "lossless-when-bounded-otherwise-webp-q95",
            "sourceArtifactId": EXPECTED_RECOVERY_ARTIFACT,
            "sourceArtifactSha256": "d42a4549fd5ebd90a761ced87a72d6765de6bb56403055af5c9cec8bda6ed731",
            "sourceManifestSha256": EXPECTED_MANIFEST_SHA256,
        },
        "originalArtifactId": EXPECTED_ORIGINAL_ARTIFACT,
        "recoveryArtifactId": EXPECTED_RECOVERY_ARTIFACT,
        "originalAssetsUnchanged": unchanged,
        "recoveredAssets": recovered_names,
        "runtimeLosslessDerivatives": lossless_count,
        "runtimeLossyDerivatives": lossy_count,
        "assets": assets,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(ledger, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    update_runtime_manifest(assets)
    print(json.dumps({
        "status": "passed",
        "assets": len(assets),
        "unchangedOriginals": unchanged,
        "recovered": recovered_names,
        "runtimeLosslessDerivatives": lossless_count,
        "runtimeLossyDerivatives": lossy_count,
        "maxRuntimeBytes": max(asset["runtimeBytes"] for asset in assets),
        "minLossyCompositePsnrDb": min(
            (asset["minCompositePsnrDb"] for asset in assets if asset["runtimeEncoding"] == "webp-q95"),
            default=99.0,
        ),
        "ledgerSha256": sha256(output),
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
