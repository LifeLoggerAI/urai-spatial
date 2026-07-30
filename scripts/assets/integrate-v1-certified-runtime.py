#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import zipfile
from pathlib import Path

from PIL import Image

EXPECTED_RECOVERY_ZIP_SHA256 = "d42a4549fd5ebd90a761ced87a72d6765de6bb56403055af5c9cec8bda6ed731"
EXPECTED_LEDGER_ZIP_SHA256 = "1701ecd63797c925f0824f63ef08883490e39d23ac2f896fb6f0ee743cffe49e"
EXPECTED_LEDGER_SHA256 = "202f17d0f5d9ebab92a816c52a0d3fad4f703b4032a03367f199bf291c551ac5"
EXPECTED_ASSET_COUNT = 53


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pixel_sha(path: Path) -> tuple[str, int, int, bool]:
    with Image.open(path) as image:
        image.load()
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        digest = hashlib.sha256()
        digest.update(f"{rgba.width}x{rgba.height}:RGBA\n".encode())
        digest.update(rgba.tobytes())
        return digest.hexdigest(), rgba.width, rgba.height, alpha.getextrema() != (255, 255)


def extract(zip_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(destination)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--recovery-zip", required=True)
    parser.add_argument("--ledger-zip", required=True)
    parser.add_argument("--work-dir", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    repo = Path(args.repo_root).resolve()
    recovery_zip = Path(args.recovery_zip).resolve()
    ledger_zip = Path(args.ledger_zip).resolve()
    work = Path(args.work_dir).resolve()
    receipt_path = Path(args.receipt).resolve()

    if sha256(recovery_zip) != EXPECTED_RECOVERY_ZIP_SHA256:
        raise ValueError("retained V1 recovery artifact hash mismatch")
    if sha256(ledger_zip) != EXPECTED_LEDGER_ZIP_SHA256:
        raise ValueError("retained V1 certification artifact hash mismatch")

    if work.exists():
        shutil.rmtree(work)
    recovery_root = work / "recovery"
    ledger_root = work / "ledger"
    extract(recovery_zip, recovery_root)
    extract(ledger_zip, ledger_root)

    ledger_path = ledger_root / "v1-certified-runtime-ledger.json"
    if sha256(ledger_path) != EXPECTED_LEDGER_SHA256:
        raise ValueError("certified V1 ledger hash mismatch")
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    assets = ledger.get("assets")
    if not isinstance(assets, list) or len(assets) != EXPECTED_ASSET_COUNT:
        raise ValueError("certified V1 ledger must contain exactly 53 assets")

    pack_zip = recovery_root / "image_asset_generator/asset_pack.zip"
    pack_root = work / "pack"
    extract(pack_zip, pack_root)

    changed: list[str] = []
    verified: list[dict[str, object]] = []
    canonical_paths: set[str] = set()
    for asset in assets:
        name = str(asset["n"])
        canonical = str(asset["p"])
        source_rel = str(asset["src"])
        if not canonical.startswith("assets/urai/") or not canonical.endswith(".webp"):
            raise ValueError(f"{name}: invalid canonical path")
        if canonical in canonical_paths:
            raise ValueError(f"{name}: duplicate canonical path")
        canonical_paths.add(canonical)

        source = pack_root / source_rel
        if not source.is_file():
            raise FileNotFoundError(f"{name}: retained source missing: {source_rel}")
        if sha256(source) != asset["srcSha256"]:
            raise ValueError(f"{name}: retained source hash mismatch")

        destination = repo / "urai-tier1/public" / canonical
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + ".tmp")
        with Image.open(source) as image:
            image.load()
            image.save(temporary, "WEBP", method=6, lossless=True, exact=True)

        rendered = sha256(temporary)
        pixels, width, height, has_alpha = pixel_sha(temporary)
        expected = (str(asset["s"]), str(asset["x"]), int(asset["w"]), int(asset["h"]), bool(asset["a"]))
        actual = (rendered, pixels, width, height, has_alpha)
        if actual != expected:
            raise ValueError(f"{name}: final WebP binding mismatch: expected={expected}, actual={actual}")

        previous = sha256(destination) if destination.is_file() else None
        temporary.replace(destination)
        if previous != rendered:
            changed.append(destination.relative_to(repo).as_posix())
        verified.append({
            "name": name,
            "canonicalPath": canonical,
            "repoPath": destination.relative_to(repo).as_posix(),
            "sha256": rendered,
            "pixelSha256": pixels,
            "width": width,
            "height": height,
            "alpha": has_alpha,
            "providerRequestId": asset.get("q"),
            "providerModel": asset.get("m"),
        })

    if len(canonical_paths) != EXPECTED_ASSET_COUNT:
        raise ValueError("V1 canonical path count mismatch")

    receipt = {
        "schemaVersion": "1.0.0",
        "program": "URAI certified V1 runtime integration",
        "sourceArtifactId": 8742902079,
        "sourceArtifactSha256": EXPECTED_RECOVERY_ZIP_SHA256,
        "certificationArtifactId": 8757895352,
        "certificationArtifactSha256": EXPECTED_LEDGER_ZIP_SHA256,
        "ledgerSha256": EXPECTED_LEDGER_SHA256,
        "providerCalls": 0,
        "spendUsd": "0.00",
        "integrated": EXPECTED_ASSET_COUNT,
        "changed": len(changed),
        "changedPaths": sorted(changed),
        "assets": verified,
    }
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"status": "passed", "integrated": len(verified), "changed": len(changed)}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
