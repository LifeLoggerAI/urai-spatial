#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path
from typing import Any

from PIL import Image

EXPECTED_LEDGER_SHA256 = "d4834dc49e2bdfe835a2adcc4190bbb5ae14469c02e28083662f087231d1597b"
EXPECTED_ASSET_COUNT = 53
EXPECTED_LOSSLESS_COUNT = 22
EXPECTED_OPTIMIZED_COUNT = 31
MAX_RUNTIME_BYTES = 1_048_576
MIN_COMPOSITE_PSNR_DB = 37.0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pixel_receipt(path: Path) -> tuple[str, int, int, bool, str]:
    with Image.open(path) as image:
        image.load()
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        pixel_digest = hashlib.sha256()
        pixel_digest.update(f"{rgba.width}x{rgba.height}:RGBA\n".encode())
        pixel_digest.update(rgba.tobytes())
        alpha_digest = hashlib.sha256(alpha.tobytes()).hexdigest()
        return pixel_digest.hexdigest(), rgba.width, rgba.height, alpha.getextrema() != (255, 255), alpha_digest


def require_number(asset: dict[str, Any], key: str) -> float:
    value = asset.get(key)
    if not isinstance(value, (int, float)):
        raise ValueError(f"{asset.get('n', '<unknown>')}: ledger field {key} is not numeric")
    return float(value)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--staging-root", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    repo = Path(args.repo_root).resolve()
    ledger_path = Path(args.ledger).resolve()
    staging_root = Path(args.staging_root).resolve()
    receipt_path = Path(args.receipt).resolve()

    ledger_digest = sha256(ledger_path)
    if ledger_digest != EXPECTED_LEDGER_SHA256:
        raise ValueError(f"certified V1 ledger hash mismatch: {ledger_digest}")

    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    assets = ledger.get("assets")
    if not isinstance(assets, list) or len(assets) != EXPECTED_ASSET_COUNT:
        raise ValueError("certified V1 ledger must contain exactly 53 assets")

    authority = ledger.get("authority")
    if not isinstance(authority, dict):
        raise ValueError("certified V1 ledger authority is missing")
    if authority.get("runtimeDerivativePolicy") != "lossless-when-bounded-otherwise-webp-q95":
        raise ValueError("certified V1 derivative policy mismatch")
    if int(authority.get("runtimeBudgetBytes", 0)) != MAX_RUNTIME_BYTES:
        raise ValueError("certified V1 runtime budget mismatch")
    if int(authority.get("providerCallsDuringRecertification", -1)) != 0:
        raise ValueError("certified V1 ledger records unexpected provider calls")

    names: set[str] = set()
    canonical_paths: set[str] = set()
    runtime_hashes: set[str] = set()
    verified: list[dict[str, Any]] = []
    changed_paths: list[str] = []
    lossless_count = 0
    optimized_count = 0

    for raw_asset in assets:
        if not isinstance(raw_asset, dict):
            raise ValueError("certified V1 ledger contains a non-object asset")
        asset = raw_asset
        name = str(asset.get("n", ""))
        canonical = str(asset.get("p", ""))
        runtime_sha = str(asset.get("s", ""))
        runtime_pixel_sha = str(asset.get("x", ""))
        master_pixel_sha = str(asset.get("masterPixelSha256", ""))
        source_sha = str(asset.get("srcSha256", ""))
        encoding = str(asset.get("runtimeEncoding", ""))
        runtime_bytes = int(require_number(asset, "runtimeBytes"))
        runtime_max_bytes = int(require_number(asset, "runtimeMaxBytes"))
        fidelity = require_number(asset, "minCompositePsnrDb")

        if not name or name in names:
            raise ValueError(f"duplicate or empty certified V1 name: {name!r}")
        names.add(name)
        if not canonical.startswith("assets/urai/") or not canonical.endswith(".webp") or canonical in canonical_paths:
            raise ValueError(f"{name}: invalid or duplicate canonical path: {canonical}")
        canonical_paths.add(canonical)
        if not runtime_sha or runtime_sha in runtime_hashes:
            raise ValueError(f"{name}: empty or duplicate runtime hash")
        runtime_hashes.add(runtime_sha)
        if not source_sha or not master_pixel_sha or not runtime_pixel_sha:
            raise ValueError(f"{name}: incomplete master/runtime binding")
        if runtime_max_bytes != MAX_RUNTIME_BYTES or runtime_bytes > MAX_RUNTIME_BYTES:
            raise ValueError(f"{name}: runtime derivative exceeds the 1 MiB contract")
        if asset.get("alphaExact") is not True:
            raise ValueError(f"{name}: alpha channel is not exact")

        if encoding == "lossless-exact":
            lossless_count += 1
            if asset.get("runtimeQuality") is not None:
                raise ValueError(f"{name}: lossless derivative unexpectedly has a quality value")
            if runtime_pixel_sha != master_pixel_sha:
                raise ValueError(f"{name}: lossless derivative changed decoded pixels")
        elif encoding == "webp-q95":
            optimized_count += 1
            if int(require_number(asset, "runtimeQuality")) != 95:
                raise ValueError(f"{name}: optimized derivative is not WebP quality 95")
            if fidelity < MIN_COMPOSITE_PSNR_DB:
                raise ValueError(f"{name}: optimized derivative fidelity is below {MIN_COMPOSITE_PSNR_DB:.1f} dB")
        else:
            raise ValueError(f"{name}: unsupported runtime derivative encoding: {encoding}")

        staged = staging_root / canonical
        if not staged.is_file():
            raise FileNotFoundError(f"{name}: deterministic staged derivative missing: {canonical}")
        if staged.stat().st_size != runtime_bytes or sha256(staged) != runtime_sha:
            raise ValueError(f"{name}: staged derivative byte identity mismatch")

        staged_pixel_sha, width, height, has_alpha, staged_alpha_sha = pixel_receipt(staged)
        expected_geometry = (int(asset["w"]), int(asset["h"]), bool(asset["a"]))
        if (width, height, has_alpha) != expected_geometry:
            raise ValueError(f"{name}: staged derivative geometry or alpha mode changed")
        if staged_pixel_sha != runtime_pixel_sha:
            raise ValueError(f"{name}: staged derivative decoded-pixel identity mismatch")

        destination = repo / "urai-tier1/public" / canonical
        destination.parent.mkdir(parents=True, exist_ok=True)
        previous_sha = sha256(destination) if destination.is_file() else None
        temporary = destination.with_suffix(destination.suffix + ".certified.tmp")
        shutil.copyfile(staged, temporary)
        if sha256(temporary) != runtime_sha:
            temporary.unlink(missing_ok=True)
            raise ValueError(f"{name}: copied derivative byte identity mismatch")
        temporary.replace(destination)

        destination_pixel_sha, destination_width, destination_height, destination_alpha, destination_alpha_sha = pixel_receipt(destination)
        if (
            sha256(destination) != runtime_sha
            or destination.stat().st_size != runtime_bytes
            or destination_pixel_sha != runtime_pixel_sha
            or (destination_width, destination_height, destination_alpha) != expected_geometry
            or destination_alpha_sha != staged_alpha_sha
        ):
            raise ValueError(f"{name}: committed runtime derivative verification failed")
        if previous_sha != runtime_sha:
            changed_paths.append(destination.relative_to(repo).as_posix())

        verified.append({
            "name": name,
            "canonicalPath": canonical,
            "sourceMasterSha256": source_sha,
            "masterPixelSha256": master_pixel_sha,
            "runtimeSha256": runtime_sha,
            "runtimePixelSha256": runtime_pixel_sha,
            "width": width,
            "height": height,
            "alpha": has_alpha,
            "alphaExact": True,
            "bytes": runtime_bytes,
            "encoding": encoding,
            "quality": asset.get("runtimeQuality"),
            "minCompositePsnrDb": fidelity,
            "accepted": True,
        })

    if lossless_count != EXPECTED_LOSSLESS_COUNT or optimized_count != EXPECTED_OPTIMIZED_COUNT:
        raise ValueError(
            f"certified V1 derivative count mismatch: lossless={lossless_count}, optimized={optimized_count}"
        )

    receipt = {
        "schemaVersion": "2.0.0",
        "program": "URAI certified V1 deterministic runtime integration",
        "candidateSha": os.environ.get("URAI_EXACT_HEAD"),
        "ledgerSha256": ledger_digest,
        "providerCalls": 0,
        "spendUsd": "0.00",
        "integrated": len(verified),
        "accepted": len(verified),
        "rejected": 0,
        "missing": 0,
        "losslessDerivatives": lossless_count,
        "optimizedDerivatives": optimized_count,
        "maximumRuntimeBytes": max(item["bytes"] for item in verified),
        "minimumOptimizedCompositePsnrDb": min(
            item["minCompositePsnrDb"] for item in verified if item["encoding"] == "webp-q95"
        ),
        "changed": len(changed_paths),
        "changedPaths": sorted(changed_paths),
        "assets": verified,
    }
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "passed",
        "candidateSha": receipt["candidateSha"],
        "integrated": len(verified),
        "changed": len(changed_paths),
        "lossless": lossless_count,
        "optimized": optimized_count,
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
