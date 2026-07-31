#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image

CERTIFIED_AT = "2026-07-30T12:42:15Z"
EXPECTED_COUNT = 53
EXPECTED_LEDGER_SHA256 = "d4834dc49e2bdfe835a2adcc4190bbb5ae14469c02e28083662f087231d1597b"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ratio(width: int, height: int) -> str:
    divisor = math.gcd(width, height)
    return f"{width // divisor}:{height // divisor}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()

    root = Path(args.repo_root).resolve()
    ledger_path = Path(args.ledger).resolve()
    manifest_path = Path(args.manifest).resolve()

    if sha256(ledger_path) != EXPECTED_LEDGER_SHA256:
        raise ValueError("certified V1 ledger hash mismatch")

    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    ledger_assets = ledger.get("assets")
    manifest_assets = manifest.get("assets")
    if not isinstance(ledger_assets, list) or len(ledger_assets) != EXPECTED_COUNT:
        raise ValueError("certified V1 ledger must contain 53 assets")
    if not isinstance(manifest_assets, list) or len(manifest_assets) != EXPECTED_COUNT:
        raise ValueError("runtime handoff manifest must contain 53 assets")

    by_path = {str(asset["p"]): asset for asset in ledger_assets}
    if len(by_path) != EXPECTED_COUNT:
        raise ValueError("certified V1 ledger canonical paths are not unique")

    synchronized = 0
    for asset in manifest_assets:
        canonical = str(asset.get("canonicalPath", ""))
        authority = by_path.get(canonical)
        if authority is None:
            raise ValueError(f"manifest path is absent from certified ledger: {canonical}")

        runtime = root / "urai-tier1/public" / canonical
        if not runtime.is_file():
            raise FileNotFoundError(f"certified runtime file missing: {canonical}")
        actual_sha = sha256(runtime)
        if actual_sha != authority["s"]:
            raise ValueError(f"certified runtime hash mismatch: {canonical}")

        with Image.open(runtime) as image:
            image.load()
            width, height = image.size
            alpha_extrema = image.convert("RGBA").getchannel("A").getextrema()
            has_alpha = alpha_extrema != (255, 255)

        expected = (int(authority["w"]), int(authority["h"]), bool(authority["a"]))
        actual = (width, height, has_alpha)
        if actual != expected:
            raise ValueError(f"certified runtime geometry/alpha mismatch: {canonical}: {actual} != {expected}")

        asset.update({
            "status": "ready",
            "sourcePath": authority["src"],
            "sourceSize": max(width, height),
            "width": width,
            "height": height,
            "aspectRatio": ratio(width, height),
            "alpha": has_alpha,
            "sha256": actual_sha,
            "bytes": runtime.stat().st_size,
            "promptVersion": "certified-v1-20260730",
            "renderer": authority["r"],
            "providerRequestId": authority["q"],
            "providerModel": authority.get("m"),
            "sourceSha256": authority["srcSha256"],
            "metadataSha256": authority["metadataSha256"],
            "claimGate": None,
        })
        synchronized += 1

    manifest.update({
        "schemaVersion": "4.0.0",
        "generatedAt": CERTIFIED_AT,
        "version": "v1-certified-runtime",
        "producer": "LifeLoggerAI/asset-factory",
        "consumer": "LifeLoggerAI/urai-spatial",
        "copyRoot": "urai-tier1/public",
        "providerRequired": True,
        "ready": EXPECTED_COUNT,
        "missing": 0,
        "certification": {
            "sourceArtifactId": 8742902079,
            "sourceArtifactSha256": "d42a4549fd5ebd90a761ced87a72d6765de6bb56403055af5c9cec8bda6ed731",
            "certificationArtifactId": 8757895352,
            "certificationArtifactSha256": "1701ecd63797c925f0824f63ef08883490e39d23ac2f896fb6f0ee743cffe49e",
            "ledgerSha256": EXPECTED_LEDGER_SHA256,
            "providerCallsDuringIntegration": 0,
            "spendUsdDuringIntegration": "0.00",
            "pixelVerified": EXPECTED_COUNT,
        },
    })

    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    print(json.dumps({"status": "passed", "synchronized": synchronized, "manifest": str(manifest_path)}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
