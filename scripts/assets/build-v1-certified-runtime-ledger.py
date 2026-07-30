#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image

EXPECTED_RECOVERY_ARTIFACT = 8742902079
EXPECTED_ORIGINAL_ARTIFACT = 8741010314
EXPECTED_RECOVERED_RECEPTIONIST_SHA256 = "d95bb0f4b2703e32b8cb2295dc42a2f900a9eaf749a48a3c7f334ab4edc29c05"
EXPECTED_RECEPTIONIST_REQUEST = "req_bb92582789134dbdb24e6f9f8c66c8ae"
EXPECTED_MANIFEST_SHA256 = "71591486803582a7468d375f05b341538c7fd5bd232bb330c16d6ce2ec5b155a"


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


def image_root(root: Path) -> Path:
    candidate = root / "image_asset_generator"
    if not candidate.is_dir():
        raise FileNotFoundError(f"artifact image_asset_generator root missing: {candidate}")
    return candidate


def metadata_details(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    details = payload.get("metadata")
    return details if isinstance(details, dict) else {}


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
        destination.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(recovered_source) as image:
            image.load()
            image.save(destination, "WEBP", method=6, lossless=True, exact=True)

        pixel_sha, width, height, has_alpha = pixel_receipt(destination)
        source_pixel_sha, source_width, source_height, source_has_alpha = pixel_receipt(recovered_source)
        if (pixel_sha, width, height, has_alpha) != (
            source_pixel_sha,
            source_width,
            source_height,
            source_has_alpha,
        ):
            raise ValueError(f"{name}: exact-alpha WebP pixel binding failed")

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
            "s": sha256(destination),
            "x": pixel_sha,
            "w": width,
            "h": height,
            "a": bool(entry.get("alpha")),
            "r": str(entry.get("renderer", "provider")),
            "q": str(request_id),
            "m": details.get("provider_model") or details.get("provider"),
            "src": relative_source.as_posix(),
            "srcSha256": sha256(recovered_source),
            "metadataSha256": sha256(recovered_metadata),
        })

    if unchanged != 52 or recovered_names != ["avatar_receptionist"]:
        raise ValueError(f"retained/recovered boundary mismatch: unchanged={unchanged}, recovered={recovered_names}")
    if len({asset["n"] for asset in assets}) != 53 or len({asset["p"] for asset in assets}) != 53:
        raise ValueError("V1 ledger names or paths are not unique")

    ledger = {
        "schemaVersion": "1.1.0",
        "authority": {
            "consumer": "LifeLoggerAI/urai-spatial",
            "expectedOutputs": 53,
            "missing": 0,
            "pixelVerified": 53,
            "producer": "LifeLoggerAI/asset-factory",
            "providerCallsDuringRecertification": 0,
            "ready": 53,
            "sourceArtifactId": EXPECTED_RECOVERY_ARTIFACT,
            "sourceArtifactSha256": "d42a4549fd5ebd90a761ced87a72d6765de6bb56403055af5c9cec8bda6ed731",
            "sourceManifestSha256": EXPECTED_MANIFEST_SHA256,
        },
        "originalArtifactId": EXPECTED_ORIGINAL_ARTIFACT,
        "recoveryArtifactId": EXPECTED_RECOVERY_ARTIFACT,
        "originalAssetsUnchanged": unchanged,
        "recoveredAssets": recovered_names,
        "assets": assets,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(ledger, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "passed",
        "assets": len(assets),
        "unchangedOriginals": unchanged,
        "recovered": recovered_names,
        "ledgerSha256": sha256(output),
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
