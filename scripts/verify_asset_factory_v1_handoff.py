#!/usr/bin/env python3
"""Fail-closed verifier for the certified Asset Factory V1 Spatial handoff."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path.cwd().resolve()
CONTRACT_PATH = ROOT / "operations/assets/contracts/asset-factory-v1-spatial-pack.json"
REGISTRY_PATH = ROOT / "urai-tier1/src/spatial/assets/uraiAssets.ts"
ERRORS: list[str] = []
NOTES: list[str] = []


def fail(condition: bool, message: str) -> None:
    if not condition:
        ERRORS.append(message)


def load_json(path: Path, label: str) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        ERRORS.append(f"{label}: {exc}")
        return None


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def valid_sha(value: Any, length: int = 64) -> bool:
    return isinstance(value, str) and bool(re.fullmatch(rf"[0-9a-fA-F]{{{length}}}", value))


def as_set(values: Any) -> set[str]:
    return {str(value) for value in values}


def same_set(actual: Any, expected: Any, label: str) -> None:
    fail(as_set(actual) == as_set(expected), f"{label}: set mismatch")


def validate_root(raw: str, label: str) -> Path:
    candidate = Path(raw).absolute()
    try:
        stat = candidate.lstat()
        fail(stat and candidate.is_dir() and not candidate.is_symlink(), f"{label}: root must be a real directory")
        fail(candidate.resolve(strict=True) == candidate, f"{label}: root path contains a symlink component")
    except Exception as exc:
        ERRORS.append(f"{label}: missing or unreadable root {candidate}: {exc}")
    return candidate


def reject_symlinks(directory: Path, label: str) -> None:
    if not directory.exists():
        return
    fail(not directory.is_symlink(), f"{label}: root symlink forbidden")
    for path in directory.rglob("*"):
        fail(not path.is_symlink(), f"{label}: symbolic link forbidden: {path}")


def safe(base: Path, relative: str, label: str) -> Path:
    target = (base / str(relative or "")).absolute()
    try:
        target.relative_to(base.absolute())
    except ValueError:
        ERRORS.append(f"{label}: path escapes root")
        return base / "__invalid__"
    return target


def regular(path: Path, label: str) -> bool:
    try:
        stat = path.lstat()
        okay = path.is_file() and not path.is_symlink()
        fail(okay, f"{label}: not a regular non-symlink file")
        return okay and stat.st_size >= 0
    except Exception:
        ERRORS.append(f"{label}: missing {path}")
        return False


def report_path(raw: str) -> Path:
    artifacts = ROOT / "artifacts"
    destination = (ROOT / raw).absolute()
    try:
        destination.relative_to(artifacts)
    except ValueError:
        ERRORS.append("report path must stay under artifacts/")
    public = ROOT / "urai-tier1/public"
    try:
        destination.relative_to(public)
        ERRORS.append("report path may not be inside the public asset tree")
    except ValueError:
        pass
    current = destination.parent
    while current != ROOT and ROOT in current.parents:
        if current.exists():
            fail(not current.is_symlink(), f"report path contains symlink component: {current}")
        current = current.parent
    return destination


def verify_contract(contract: dict[str, Any]) -> list[dict[str, Any]]:
    fail(contract.get("schemaVersion") == "1.0.0", "contract schema mismatch")
    fail(contract.get("contractId") == "URAI-SPATIAL-ASSET-FACTORY-V1-INTAKE-20260711", "contract id mismatch")
    fail(contract.get("producer") == "LifeLoggerAI/asset-factory" and contract.get("consumer") == "LifeLoggerAI/urai-spatial", "contract repository identity mismatch")
    fail(contract.get("version") == "v1" and contract.get("expectedOutputs") == 53, "contract V1 output count mismatch")
    fail((contract.get("directProviderOutputs"), contract.get("reusedProviderOutputs"), contract.get("newProviderCalls"), contract.get("derivedProviderOutputs")) == (48, 1, 47, 5), "contract provider counts mismatch")
    fail(float(contract.get("maxUnitCostUsd", 0)) == 1 and float(contract.get("maxTotalCostUsd", 0)) == 47, "contract cost ceilings mismatch")
    fail(contract.get("assetPrefix") == "assets/urai/" and contract.get("copyRoot") == "urai-tier1/public", "contract path authority mismatch")
    fail(contract.get("activationMode") == "atomic-complete-pack" and contract.get("promotion") is False, "contract activation boundary mismatch")
    fail(valid_sha(contract.get("authorizedMarkerSha"), 40), "contract marker SHA malformed")
    fail(isinstance(contract.get("seedProviderRequestId"), str) and len(contract["seedProviderRequestId"]) > 8, "contract seed request missing")

    assets = contract.get("assets") if isinstance(contract.get("assets"), list) else []
    fail(len(assets) == 53, f"contract expected 53 assets, found {len(assets)}")
    fail(len({asset.get('name') for asset in assets}) == 53, "contract names are not unique")
    fail(len({asset.get('canonicalPath') for asset in assets}) == 53, "contract paths are not unique")
    for asset in assets:
        name = str(asset.get("name", ""))
        canonical = str(asset.get("canonicalPath", ""))
        fail(bool(re.fullmatch(r"[a-z0-9_]+", name)), f"contract/{name}: invalid name")
        fail(canonical.startswith("assets/urai/") and canonical.endswith(".webp") and not any(part in {"", ".", ".."} for part in canonical.split("/")), f"contract/{name}: unsafe path")
        fail(asset.get("sourceMode") in {"new-provider", "reused-provider", "derived-provider"}, f"contract/{name}: invalid source mode")
        fail(isinstance(asset.get("registryRequired"), bool), f"contract/{name}: registryRequired must be boolean")
    fail(sum(asset.get("sourceMode") == "new-provider" for asset in assets) == 47, "contract new-provider count mismatch")
    reused = [asset for asset in assets if asset.get("sourceMode") == "reused-provider"]
    fail(len(reused) == 1 and reused[0].get("name") == "home_threshold_main", "contract reused Home boundary mismatch")
    same_set([asset.get("name") for asset in assets if asset.get("sourceMode") == "derived-provider"], ["status_route_matrix_main", "status_route_matrix_mobile", "status_health_pill", "open_graph_launch", "open_graph_life_map"], "contract derived names")
    fail(sum(bool(asset.get("registryRequired")) for asset in assets) == 51, "contract registry count mismatch")

    regular(REGISTRY_PATH, "Spatial asset registry")
    if REGISTRY_PATH.exists():
        registry = REGISTRY_PATH.read_text(encoding="utf-8")
        registered = [f"assets/urai{match}" for match in re.findall(r"\bwebp\(\s*[\"']([^\"'\n]+)[\"']\s*\)", registry)]
        fail(len(set(registered)) == len(registered), "Spatial registry has duplicate WebP paths")
        same_set(registered, [asset["canonicalPath"] for asset in assets if asset.get("registryRequired")], "Spatial registry paths")
    for name, markers in (contract.get("spatialCanon") or {}).items():
        fail(any(asset.get("name") == name for asset in assets), f"spatial canon references unknown asset {name}")
        fail(isinstance(markers, list) and markers and all(isinstance(marker, str) and marker == marker.lower() for marker in markers), f"spatial canon markers invalid for {name}")
    return assets


def verify_artifacts(contract: dict[str, Any], assets: list[dict[str, Any]], generation_raw: str, post_raw: str) -> None:
    generation = validate_root(generation_raw, "generation artifact")
    post_root = validate_root(post_raw, "post-certification artifact")
    reject_symlinks(generation, "generation artifact")
    reject_symlinks(post_root, "post-certification artifact")
    if ERRORS:
        return

    layout = contract["artifactLayout"]
    files = {key: safe(post_root if key == "postCertificationReport" else generation, value, key) for key, value in layout.items()}
    for key, path in files.items():
        if key != "handoffRoot":
            regular(path, key)
    if ERRORS:
        return

    manifest = load_json(files["generatedManifest"], "generated manifest")
    forge = load_json(files["forgeReceipt"], "forge receipt")
    quality = load_json(files["qualityReport"], "quality report")
    dropin = load_json(files["dropinReceipt"], "drop-in receipt")
    budget = load_json(files["budgetLedger"], "budget ledger")
    handoff = load_json(files["versionedHandoffManifest"], "versioned handoff")
    generic = load_json(files["genericHandoffManifest"], "generic handoff")
    post = load_json(files["postCertificationReport"], "post-certification report")
    if ERRORS:
        return

    expected_names = [asset["name"] for asset in assets]
    expected_paths = [asset["canonicalPath"] for asset in assets]
    by_name = {asset["name"]: asset for asset in assets}
    direct_names = [asset["name"] for asset in assets if asset["sourceMode"] != "derived-provider"]
    new_names = [asset["name"] for asset in assets if asset["sourceMode"] == "new-provider"]
    generator_base = generation / "image_asset_generator"
    manifest_hash = digest(files["generatedManifest"])

    fail(isinstance(manifest, list) and len(manifest) == 53, "generated manifest must contain 53 entries")
    same_set([entry.get("name") for entry in manifest or []], expected_names, "generated manifest names")
    request_by_name: dict[str, str] = {}
    source_by_name: dict[str, Path] = {}
    metadata_by_name: dict[str, Path] = {}
    direct_request_ids: set[str] = set()
    for entry in manifest or []:
        name = entry.get("name")
        expected = by_name.get(name)
        if not expected:
            continue
        fail(entry.get("status") == "generated" and entry.get("renderer") == "provider", f"manifest/{name}: not generated by provider")
        prompt = str(entry.get("prompt", "")).lower()
        for marker in (contract.get("spatialCanon") or {}).get(name, []):
            fail(marker in prompt, f"manifest/{name}: missing canon marker {marker}")
        sizes = [value for value in entry.get("sizes", []) if isinstance(value, int) and value > 0]
        template = entry.get("path_template")
        fail(bool(sizes) and isinstance(template, str) and "{size}" in template, f"manifest/{name}: invalid output path contract")
        if not sizes or not isinstance(template, str):
            continue
        source = safe(generator_base, template.replace("{size}", str(max(sizes))), f"manifest/{name}/source")
        metadata_path = Path(f"{source}.render.json")
        regular(source, f"manifest/{name}/source")
        regular(metadata_path, f"manifest/{name}/metadata")
        source_by_name[name] = source
        metadata_by_name[name] = metadata_path
        metadata = load_json(metadata_path, f"manifest/{name}/metadata") or {}
        details = metadata.get("metadata") if isinstance(metadata.get("metadata"), dict) else {}
        fail(metadata.get("renderer") == "provider", f"manifest/{name}: metadata renderer mismatch")
        if expected["sourceMode"] == "derived-provider":
            inherited = details.get("source_provider_request_ids")
            fail(details.get("provider") == "derived-provider" and isinstance(inherited, list) and bool(inherited), f"manifest/{name}: derived provenance missing")
            derivation = (entry.get("derivation") or {}).get("sourceProviderRequestIds")
            same_set(inherited or [], derivation or [], f"manifest/{name}: derived request ids")
        else:
            request_id = details.get("provider_request_id")
            fail(details.get("provider") == "openai", f"manifest/{name}: provider must be openai")
            fail(isinstance(details.get("provider_model"), str) and len(details["provider_model"]) > 3, f"manifest/{name}: provider model missing")
            fail(isinstance(request_id, str) and len(request_id) > 8, f"manifest/{name}: provider request missing")
            if isinstance(request_id, str):
                request_by_name[name] = request_id
                direct_request_ids.add(request_id)
    fail(len(request_by_name) == 48 and len(direct_request_ids) == 48, "direct provider request ids must be 48 unique values")
    fail(request_by_name.get("home_threshold_main") == contract["seedProviderRequestId"], "Home seed request mismatch")

    fail(forge.get("schemaVersion") == "2.0.0" and forge.get("version") == "v1" and forge.get("status") == "passed" and forge.get("forgeExitCode") == 0, "forge receipt identity/status mismatch")
    fail((forge.get("expectedOutputs"), forge.get("ready"), forge.get("generated"), forge.get("completed"), forge.get("missing")) == (53, 53, 53, 53, 0), "forge receipt counts mismatch")
    fail((forge.get("directProviderOutputs"), forge.get("reusedProviderOutputs"), forge.get("newProviderCalls"), forge.get("derivedProviderOutputs")) == (48, 1, 47, 5), "forge provider counts mismatch")
    fail(forge.get("seedProviderRequestId") == contract["seedProviderRequestId"] and forge.get("manifestSha256") == manifest_hash and forge.get("promotion") is False, "forge provenance boundary mismatch")
    fail(float(forge.get("reservedEstimatedCostUsd", 999)) <= 47, "forge reserved exposure exceeds ceiling")

    fail(quality.get("schemaVersion") == "2.1.0" and quality.get("status") == "passed" and quality.get("failed") == 0 and quality.get("passed") == 53, "quality report not fully passed")
    fail(quality.get("requireProvider") is True and quality.get("providerBacked") == 53 and quality.get("directProvider") == 48 and quality.get("derivedProvider") == 5, "quality provider counts mismatch")
    quality_assets = quality.get("assets") if isinstance(quality.get("assets"), list) else []
    fail(len(quality_assets) == 53 and all(item.get("status") == "passed" for item in quality_assets), "quality asset results incomplete")
    same_set([item.get("name") for item in quality_assets], expected_names, "quality asset names")

    fail(dropin.get("schemaVersion") == "1.0.0" and dropin.get("version") == "v1" and dropin.get("status") == "certified", "drop-in receipt not certified")
    fail(dropin.get("expectedOutputs") == 53 and dropin.get("ready") == 53 and dropin.get("missing") == 0 and dropin.get("targetRepo") == contract["consumer"], "drop-in receipt counts/target mismatch")
    fail(dropin.get("manifestSha256") == manifest_hash, "drop-in manifest hash mismatch")

    attempts = budget.get("attempts") if isinstance(budget.get("attempts"), list) else []
    fail(budget.get("schemaVersion") == "1.1.0" and isinstance(budget.get("runId"), str), "budget ledger identity mismatch")
    fail(budget.get("providerCallsExecuted") == 47 and float(budget.get("reservedEstimatedCostUsd", -1)) == 47 and len(attempts) == 47, "budget ledger counts/exposure mismatch")
    ledger_by_asset: dict[str, str] = {}
    for index, attempt in enumerate(attempts, start=1):
        asset = attempt.get("asset")
        request_id = attempt.get("providerRequestId")
        fail(attempt.get("attemptId") == f"{budget.get('runId')}:{index}" and attempt.get("callNumber") == index, f"budget attempt {index}: sequence mismatch")
        fail(attempt.get("status") == "succeeded" and not attempt.get("error"), f"budget attempt {index}: not successful")
        fail(attempt.get("provider") == "openai", f"budget attempt {index}: provider mismatch")
        fail(float(attempt.get("reservedUnitCostUsd", 0)) == 1 and float(attempt.get("reservedCumulativeCostUsd", 0)) == index, f"budget attempt {index}: cost mismatch")
        fail(bool(re.fullmatch(r"\d+x\d+", str(attempt.get("requestSize", "")))), f"budget attempt {index}: size mismatch")
        fail(isinstance(request_id, str) and len(request_id) > 8, f"budget attempt {index}: request id missing")
        fail(asset in new_names and asset not in ledger_by_asset, f"budget attempt {index}: asset mismatch")
        fail(request_id == request_by_name.get(asset), f"budget attempt {index}: request does not match asset {asset}")
        if isinstance(asset, str) and isinstance(request_id, str):
            ledger_by_asset[asset] = request_id
    same_set(ledger_by_asset, new_names, "budget asset names")
    fail(len(set(ledger_by_asset.values())) == 47, "budget provider request ids are not unique")

    fail(handoff.get("schemaVersion") == "3.0.0" and handoff.get("version") == "v1", "handoff identity mismatch")
    fail(handoff.get("producer") == contract["producer"] and handoff.get("consumer") == contract["consumer"], "handoff repository identity mismatch")
    fail(handoff.get("expectedOutputs") == 53 and handoff.get("ready") == 53 and handoff.get("missing") == 0, "handoff counts mismatch")
    fail(handoff.get("assetPrefix") == contract["assetPrefix"] and handoff.get("copyRoot") == contract["copyRoot"] and handoff.get("providerRequired") is True and handoff.get("activationMode") == "atomic-complete-pack", "handoff authority mismatch")
    fail(handoff.get("sourceBinding") == "lossless-webp-decoded-pixel-sha256", "handoff source binding mismatch")
    fail(handoff.get("sourceManifestSha256") == manifest_hash, "handoff source manifest hash mismatch")
    fail(digest(files["versionedHandoffManifest"]) == digest(files["genericHandoffManifest"]) and handoff == generic, "generic/versioned handoff mismatch")
    handoff_assets = handoff.get("assets") if isinstance(handoff.get("assets"), list) else []
    fail(len(handoff_assets) == 53, "handoff asset count mismatch")
    same_set([asset.get("name") for asset in handoff_assets], expected_names, "handoff names")
    same_set([asset.get("canonicalPath") for asset in handoff_assets], expected_paths, "handoff paths")
    handoff_by_name = {asset.get("name"): asset for asset in handoff_assets}
    for expected in assets:
        name = expected["name"]
        asset = handoff_by_name.get(name) or {}
        source = source_by_name.get(name)
        metadata_path = metadata_by_name.get(name)
        if not source or not metadata_path:
            continue
        fail(asset.get("status") == "ready" and asset.get("renderer") == "provider" and asset.get("canonicalPath") == expected["canonicalPath"], f"handoff/{name}: readiness mismatch")
        fail(isinstance(asset.get("bytes"), int) and asset["bytes"] > 0 and isinstance(asset.get("width"), int) and asset["width"] > 0 and isinstance(asset.get("height"), int) and asset["height"] > 0 and isinstance(asset.get("alpha"), bool) and valid_sha(asset.get("sha256")), f"handoff/{name}: receipt malformed")
        fail(asset.get("sourcePath") == source.relative_to(generator_base).as_posix(), f"handoff/{name}: source path mismatch")
        fail(asset.get("sourceSha256") == digest(source), f"handoff/{name}: source hash mismatch")
        fail(asset.get("sourceMetadataSha256") == digest(metadata_path), f"handoff/{name}: metadata hash mismatch")
        fail(valid_sha(asset.get("sourcePixelSha256")) and asset.get("sourcePixelSha256") == asset.get("handoffPixelSha256"), f"handoff/{name}: pixel binding mismatch")
        fail(asset.get("encoding") == {"format": "WEBP", "lossless": True, "method": 6}, f"handoff/{name}: encoding mismatch")
        if expected["sourceMode"] == "derived-provider":
            metadata = load_json(metadata_path, f"handoff/{name}/metadata") or {}
            same_set(asset.get("sourceProviderRequestIds") or [], (metadata.get("metadata") or {}).get("source_provider_request_ids") or [], f"handoff/{name}: derived provider ids")
        else:
            fail(asset.get("providerRequestId") == request_by_name.get(name), f"handoff/{name}: provider request mismatch")
        handoff_file = safe(files["handoffRoot"], expected["canonicalPath"], f"handoff/{name}")
        if regular(handoff_file, f"handoff/{name}"):
            fail(handoff_file.stat().st_size == asset.get("bytes") and digest(handoff_file) == str(asset.get("sha256", "")).lower(), f"handoff/{name}: bytes/hash mismatch")

    webps = [item.relative_to(files["handoffRoot"]).as_posix() for item in (files["handoffRoot"] / "assets/urai").rglob("*.webp") if not item.is_symlink()]
    same_set(webps, expected_paths, "handoff WebP inventory")
    fail(dropin.get("handoffManifestSha256") == digest(files["versionedHandoffManifest"]), "drop-in handoff hash mismatch")

    fail(post.get("schemaVersion") == "1.1.0" and post.get("status") == "passed" and post.get("sourceHeadSha") == contract["authorizedMarkerSha"], "post-certification identity/status mismatch")
    fail(post.get("sourceBinding") == "lossless-webp-decoded-pixel-sha256", "post-certification source binding mismatch")
    fail(isinstance(post.get("sourceRunId"), int) and post["sourceRunId"] > 0 and isinstance(post.get("sourceArtifactId"), int) and post["sourceArtifactId"] > 0 and post.get("directProviderAssetsChecked") == 48 and post.get("handoffAssetsChecked") == 53, "post-certification run/count mismatch")
    fail(isinstance(post.get("duplicatePairs"), list) and not post["duplicatePairs"], "post-certification found near-duplicate pairs")
    proofs = post.get("handoffAssets") if isinstance(post.get("handoffAssets"), list) else []
    fail(len(proofs) == 53, "post-certification handoff asset count mismatch")
    same_set([proof.get("name") for proof in proofs], expected_names, "post-certification handoff names")
    proof_by_name = {proof.get("name"): proof for proof in proofs}
    for expected in assets:
        name = expected["name"]
        proof = proof_by_name.get(name) or {}
        handoff_asset = handoff_by_name.get(name) or {}
        source = source_by_name.get(name)
        metadata_path = metadata_by_name.get(name)
        if not source or not metadata_path:
            continue
        fail(proof.get("sourceSha256") == digest(source) == handoff_asset.get("sourceSha256"), f"post-certification/{name}: source hash mismatch")
        fail(proof.get("sourceMetadataSha256") == digest(metadata_path) == handoff_asset.get("sourceMetadataSha256"), f"post-certification/{name}: metadata hash mismatch")
        fail(proof.get("sourcePixelSha256") == handoff_asset.get("sourcePixelSha256") == proof.get("handoffPixelSha256") == handoff_asset.get("handoffPixelSha256"), f"post-certification/{name}: pixel equivalence mismatch")
        handoff_file = safe(files["handoffRoot"], expected["canonicalPath"], f"post-certification/{name}/handoff")
        fail(proof.get("handoffSha256") == digest(handoff_file) == handoff_asset.get("sha256"), f"post-certification/{name}: handoff hash mismatch")
        fail(proof.get("canonicalPath") == expected["canonicalPath"], f"post-certification/{name}: canonical path mismatch")

    direct_proofs = post.get("assets") if isinstance(post.get("assets"), list) else []
    fail(len(direct_proofs) == 48, "post-certification direct asset count mismatch")
    same_set([proof.get("name") for proof in direct_proofs], direct_names, "post-certification direct names")
    post_ids: set[str] = set()
    for proof in direct_proofs:
        name = proof.get("name")
        source = source_by_name.get(name)
        fail(proof.get("providerRequestId") == request_by_name.get(name), f"post-certification/{name}: provider request mismatch")
        fail(valid_sha(proof.get("sourceSha256")) and valid_sha(proof.get("perceptualHash")), f"post-certification/{name}: hash malformed")
        if source:
            fail(digest(source) == str(proof.get("sourceSha256", "")).lower(), f"post-certification/{name}: source hash mismatch")
        if isinstance(proof.get("providerRequestId"), str):
            post_ids.add(proof["providerRequestId"])
    same_set(post_ids, request_by_name.values(), "post-certification provider request ids")
    fail(len(post_ids) == 48, "post-certification provider request ids are not unique")

    NOTES.append("Certified all 53 V1 Spatial assets without moving them into the runtime tree.")
    NOTES.append("Verified source-to-lossless-WebP binding, 47 asset-specific provider calls, one reused Home source, five derived outputs, and zero near-duplicate pairs.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contract-only", action="store_true")
    parser.add_argument("--generation-root")
    parser.add_argument("--post-certification-root")
    parser.add_argument("--report")
    args = parser.parse_args()

    contract = load_json(CONTRACT_PATH, "contract")
    if not isinstance(contract, dict):
        contract = {}
    assets = verify_contract(contract)
    if not args.contract_only:
        fail(bool(args.generation_root and args.post_certification_root), "artifact mode requires both artifact roots")
        if not ERRORS:
            verify_artifacts(contract, assets, args.generation_root, args.post_certification_root)
    else:
        NOTES.append("Contract and registry verified; no asset state changed.")

    report = {
        "schemaVersion": "1.1.0",
        "contractId": contract.get("contractId"),
        "mode": "contract-only" if args.contract_only else "artifact-intake",
        "status": "failed" if ERRORS else "passed",
        "promotion": False,
        "errors": ERRORS,
        "notes": NOTES,
    }
    output = json.dumps(report, indent=2) + "\n"
    if args.report:
        destination = report_path(args.report)
        if not any(error.startswith("report path") for error in ERRORS):
            destination.parent.mkdir(parents=True, exist_ok=True)
            fail(not destination.parent.is_symlink(), "report parent must be a real directory")
            if not any(error.startswith("report ") for error in ERRORS):
                destination.write_text(output, encoding="utf-8")
    sys.stdout.write(output)
    return 1 if ERRORS else 0


if __name__ == "__main__":
    raise SystemExit(main())
