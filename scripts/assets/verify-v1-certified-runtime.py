#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_AUTHORITY = {
    "consumer": "LifeLoggerAI/urai-spatial",
    "expectedOutputs": 53,
    "missing": 0,
    "pixelVerified": 53,
    "producer": "LifeLoggerAI/asset-factory",
    "providerCallsDuringRecertification": 0,
    "ready": 53,
    "sourceArtifactId": 8742902079,
    "sourceArtifactSha256": "d42a4549fd5ebd90a761ced87a72d6765de6bb56403055af5c9cec8bda6ed731",
    "sourceManifestSha256": "71591486803582a7468d375f05b341538c7fd5bd232bb330c16d6ce2ec5b155a",
}


def validate_ledger(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("V1 ledger must be a JSON object")
    if payload.get("authority") != EXPECTED_AUTHORITY:
        raise ValueError("V1 ledger authority mismatch")
    assets = payload.get("assets")
    if not isinstance(assets, list) or len(assets) != 53:
        raise ValueError("V1 ledger must contain exactly 53 assets")

    required = {"n", "p", "s", "x", "w", "h", "a", "r", "q"}
    names: set[str] = set()
    paths: set[str] = set()
    for asset in assets:
        if not isinstance(asset, dict) or not required.issubset(asset):
            raise ValueError("V1 ledger contains an incomplete asset row")
        name = str(asset["n"])
        path = str(asset["p"])
        if name in names or path in paths:
            raise ValueError(f"duplicate V1 ledger identity: {name} / {path}")
        names.add(name)
        paths.add(path)
        if not re.fullmatch(r"[a-z0-9_]+", name):
            raise ValueError(f"invalid V1 asset name: {name}")
        if not path.startswith("assets/urai/") or not path.endswith(".webp") or ".." in Path(path).parts:
            raise ValueError(f"invalid V1 canonical path: {path}")
        for key in ("s", "x"):
            if not re.fullmatch(r"[0-9a-f]{64}", str(asset[key])):
                raise ValueError(f"invalid V1 {key} hash: {name}")
        if not isinstance(asset["w"], int) or not isinstance(asset["h"], int):
            raise ValueError(f"invalid V1 dimensions: {name}")
        if asset["w"] <= 0 or asset["h"] <= 0:
            raise ValueError(f"non-positive V1 dimensions: {name}")
        if not isinstance(asset["a"], bool):
            raise ValueError(f"invalid V1 alpha contract: {name}")
    return payload


def load_ledger(path: Path | None = None) -> dict[str, Any]:
    ledger_path = path or (ROOT / "artifacts/assets/v1-certified-runtime-ledger.json")
    if not ledger_path.is_file():
        raise FileNotFoundError(f"rebuilt immutable V1 ledger missing: {ledger_path}")
    return validate_ledger(json.loads(ledger_path.read_text(encoding="utf-8")))


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
        has_transparency = alpha.getextrema() != (255, 255)
        digest = hashlib.sha256()
        digest.update(f"{rgba.width}x{rgba.height}:RGBA\n".encode())
        digest.update(rgba.tobytes())
        return digest.hexdigest(), rgba.width, rgba.height, has_transparency


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ledger")
    parser.add_argument("--repo-root", default=str(ROOT))
    parser.add_argument("--output")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    public = repo_root / "urai-tier1/public"
    registry_path = repo_root / "urai-tier1/src/spatial/assets/uraiAssets.ts"
    report = Path(args.output).resolve() if args.output else repo_root / "artifacts/assets/v1-runtime-certification.json"
    ledger_copy = report.parent / "v1-certified-runtime-ledger.json"
    ledger_path = Path(args.ledger).resolve() if args.ledger else None

    ledger = load_ledger(ledger_path)
    registry = registry_path.read_text(encoding="utf-8")
    registered = {
        f"assets/urai{match}"
        for match in re.findall(r"\bwebp\(\s*[\"']([^\"'\n]+)[\"']\s*\)", registry)
    }
    social = {
        "assets/urai/social/open-graph-launch.webp",
        "assets/urai/social/open-graph-life-map.webp",
    }

    rows: list[dict[str, Any]] = []
    for asset in ledger["assets"]:
        relative = str(asset["p"])
        path = public / relative
        row: dict[str, Any] = {
            "name": asset["n"],
            "canonicalPath": relative,
            "exists": path.is_file(),
            "registryRequired": relative not in social,
            "registered": relative in registered,
        }
        if path.is_file():
            decoded_sha, width, height, has_transparency = pixel_sha(path)
            row.update(
                {
                    "runtimeSha256": sha256(path),
                    "runtimePixelSha256": decoded_sha,
                    "width": width,
                    "height": height,
                    "hasTransparency": has_transparency,
                    "expectedSha256": asset["s"],
                    "expectedPixelSha256": asset["x"],
                    "expectedWidth": asset["w"],
                    "expectedHeight": asset["h"],
                    "expectedAlpha": asset["a"],
                    "renderer": asset["r"],
                    "providerRequestId": asset["q"],
                }
            )
            row["byteMatch"] = row["runtimeSha256"] == row["expectedSha256"]
            row["pixelMatch"] = row["runtimePixelSha256"] == row["expectedPixelSha256"]
            row["dimensionMatch"] = (width, height) == (asset["w"], asset["h"])
            row["alphaMatch"] = has_transparency == bool(asset["a"])
        else:
            row.update(
                {
                    "byteMatch": False,
                    "pixelMatch": False,
                    "dimensionMatch": False,
                    "alphaMatch": False,
                }
            )
        row["accepted"] = (
            row["exists"]
            and row["byteMatch"]
            and row["pixelMatch"]
            and row["dimensionMatch"]
            and row["alphaMatch"]
            and (row["registered"] or not row["registryRequired"])
        )
        rows.append(row)

    summary = {
        "expected": len(rows),
        "accepted": sum(bool(row["accepted"]) for row in rows),
        "rejected": sum(not bool(row["accepted"]) for row in rows),
        "missing": sum(not bool(row["exists"]) for row in rows),
        "pixelMatches": sum(bool(row.get("pixelMatch", False)) for row in rows),
        "byteMatches": sum(bool(row.get("byteMatch", False)) for row in rows),
    }
    receipt = {
        "schemaVersion": "1.1.0",
        "authority": ledger["authority"],
        "summary": summary,
        **summary,
        "assets": rows,
    }

    report.parent.mkdir(parents=True, exist_ok=True)
    ledger_copy.write_text(json.dumps(ledger, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["accepted"] == summary["expected"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
