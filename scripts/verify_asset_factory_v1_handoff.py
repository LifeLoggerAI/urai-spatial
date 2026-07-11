#!/usr/bin/env python3
"""Read-only certification of the Asset Factory V1 Spatial handoff."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path.cwd().resolve()
CONTRACT_FILE = ROOT / "operations/assets/contracts/asset-factory-v1-spatial-pack.json"
REGISTRY_FILE = ROOT / "urai-tier1/src/spatial/assets/uraiAssets.ts"
ERRORS: list[str] = []
NOTES: list[str] = []


def check(value: bool, message: str) -> None:
    if not value:
        ERRORS.append(message)


def read_json(file: Path, label: str) -> Any:
    try:
        return json.loads(file.read_text(encoding="utf-8"))
    except Exception as error:
        ERRORS.append(f"{label}: {error}")
        return None


def sha256(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


def is_sha(value: Any, length: int = 64) -> bool:
    return isinstance(value, str) and re.fullmatch(rf"[0-9a-fA-F]{{{length}}}", value) is not None


def same_set(actual: Any, expected: Any, label: str) -> None:
    check({str(item) for item in actual} == {str(item) for item in expected}, f"{label}: set mismatch")


def real_directory(raw: str, label: str) -> Path:
    supplied = Path(raw).absolute()
    try:
        check(supplied.is_dir() and not supplied.is_symlink(), f"{label}: must be a real directory")
        check(supplied.resolve(strict=True) == supplied, f"{label}: contains a symlink component")
    except Exception as error:
        ERRORS.append(f"{label}: {error}")
    return supplied


def reject_symlinks(directory: Path, label: str) -> None:
    if not directory.exists():
        return
    check(not directory.is_symlink(), f"{label}: root symlink forbidden")
    for candidate in directory.rglob("*"):
        check(not candidate.is_symlink(), f"{label}: symlink forbidden: {candidate}")


def inside(base: Path, relative: str, label: str) -> Path:
    target = (base / str(relative or "")).resolve(strict=False)
    try:
        target.relative_to(base.resolve())
    except ValueError:
        ERRORS.append(f"{label}: path escapes root")
        return base / "__invalid__"
    return target


def regular(file: Path, label: str) -> bool:
    try:
        check(file.is_file() and not file.is_symlink(), f"{label}: not a regular non-symlink file")
        return file.is_file() and not file.is_symlink()
    except Exception:
        ERRORS.append(f"{label}: missing {file}")
        return False


def safe_report(raw: str | None) -> Path | None:
    if not raw:
        return None
    destination = (ROOT / raw).resolve(strict=False)
    artifacts = (ROOT / "artifacts").resolve()
    public = (ROOT / "urai-tier1/public").resolve()
    try:
        destination.relative_to(artifacts)
    except ValueError:
        ERRORS.append("report path must stay under artifacts/")
    try:
        destination.relative_to(public)
        ERRORS.append("report path may not touch urai-tier1/public")
    except ValueError:
        pass
    current = destination.parent
    while current != ROOT and ROOT in current.parents:
        if current.exists():
            check(not current.is_symlink(), f"report path contains symlink component: {current}")
        current = current.parent
    return destination


def verify_contract(contract: dict[str, Any]) -> list[dict[str, Any]]:
    check(contract.get("schemaVersion") == "1.0.0", "contract schema mismatch")
    check(contract.get("contractId") == "URAI-SPATIAL-ASSET-FACTORY-V1-INTAKE-20260711", "contract id mismatch")
    check((contract.get("producer"), contract.get("consumer")) == ("LifeLoggerAI/asset-factory", "LifeLoggerAI/urai-spatial"), "repository identity mismatch")
    check((contract.get("version"), contract.get("expectedOutputs")) == ("v1", 53), "V1 output count mismatch")
    check((contract.get("directProviderOutputs"), contract.get("reusedProviderOutputs"), contract.get("newProviderCalls"), contract.get("derivedProviderOutputs")) == (48, 1, 47, 5), "provider counts mismatch")
    check(float(contract.get("maxUnitCostUsd", 0)) == 1 and float(contract.get("maxTotalCostUsd", 0)) == 47, "cost ceilings mismatch")
    check(contract.get("assetPrefix") == "assets/urai/" and contract.get("copyRoot") == "urai-tier1/public", "path authority mismatch")
    check(contract.get("activationMode") == "atomic-complete-pack" and contract.get("promotion") is False, "activation boundary mismatch")
    check(is_sha(contract.get("authorizedMarkerSha"), 40), "marker SHA malformed")
    check(isinstance(contract.get("seedProviderRequestId"), str) and len(contract["seedProviderRequestId"]) > 8, "seed request missing")

    assets = contract.get("assets") if isinstance(contract.get("assets"), list) else []
    check(len(assets) == 53, f"expected 53 contract assets, found {len(assets)}")
    check(len({asset.get('name') for asset in assets}) == 53, "contract names are not unique")
    check(len({asset.get('canonicalPath') for asset in assets}) == 53, "contract paths are not unique")
    for asset in assets:
        name = str(asset.get("name", ""))
        canonical = str(asset.get("canonicalPath", ""))
        check(re.fullmatch(r"[a-z0-9_]+", name) is not None, f"contract/{name}: invalid name")
        check(canonical.startswith("assets/urai/") and canonical.endswith(".webp") and not any(part in {"", ".", ".."} for part in canonical.split("/")), f"contract/{name}: unsafe path")
        check(asset.get("sourceMode") in {"new-provider", "reused-provider", "derived-provider"}, f"contract/{name}: invalid source mode")
        check(isinstance(asset.get("registryRequired"), bool), f"contract/{name}: registryRequired invalid")
    check(sum(asset.get("sourceMode") == "new-provider" for asset in assets) == 47, "new-provider count mismatch")
    reused = [asset for asset in assets if asset.get("sourceMode") == "reused-provider"]
    check(len(reused) == 1 and reused[0].get("name") == "home_threshold_main", "reused Home boundary mismatch")
    same_set([asset.get("name") for asset in assets if asset.get("sourceMode") == "derived-provider"], ["status_route_matrix_main", "status_route_matrix_mobile", "status_health_pill", "open_graph_launch", "open_graph_life_map"], "derived names")
    check(sum(bool(asset.get("registryRequired")) for asset in assets) == 51, "registry-required count mismatch")

    regular(REGISTRY_FILE, "Spatial registry")
    if REGISTRY_FILE.exists():
        registry = REGISTRY_FILE.read_text(encoding="utf-8")
        registered = [f"assets/urai{match}" for match in re.findall(r"\bwebp\(\s*[\"']([^\"'\n]+)[\"']\s*\)", registry)]
        check(len(registered) == len(set(registered)), "registry has duplicate WebP paths")
        same_set(registered, [asset["canonicalPath"] for asset in assets if asset.get("registryRequired")], "registry paths")
    for name, markers in (contract.get("spatialCanon") or {}).items():
        check(any(asset.get("name") == name for asset in assets), f"canon references unknown asset {name}")
        check(isinstance(markers, list) and markers and all(isinstance(marker, str) and marker == marker.lower() for marker in markers), f"canon markers invalid for {name}")
    return assets


def verify_artifacts(contract: dict[str, Any], assets: list[dict[str, Any]], generation_raw: str, post_raw: str) -> None:
    generation = real_directory(generation_raw, "generation artifact")
    post_root = real_directory(post_raw, "post-certification artifact")
    reject_symlinks(generation, "generation artifact")
    reject_symlinks(post_root, "post-certification artifact")
    if ERRORS:
        return

    files = {
        key: inside(post_root if key == "postCertificationReport" else generation, value, key)
        for key, value in contract["artifactLayout"].items()
    }
    for key, file in files.items():
        if key != "handoffRoot":
            regular(file, key)
    if ERRORS:
        return

    manifest = read_json(files["generatedManifest"], "generated manifest")
    forge = read_json(files["forgeReceipt"], "forge receipt")
    quality = read_json(files["qualityReport"], "quality report")
    dropin = read_json(files["dropinReceipt"], "drop-in receipt")
    budget = read_json(files["budgetLedger"], "budget ledger")
    handoff = read_json(files["versionedHandoffManifest"], "versioned handoff")
    generic = read_json(files["genericHandoffManifest"], "generic handoff")
    post = read_json(files["postCertificationReport"], "post-certification report")
    if ERRORS:
        return

    names = [asset["name"] for asset in assets]
    paths = [asset["canonicalPath"] for asset in assets]
    by_name = {asset["name"]: asset for asset in assets}
    direct_names = [asset["name"] for asset in assets if asset["sourceMode"] != "derived-provider"]
    new_names = [asset["name"] for asset in assets if asset["sourceMode"] == "new-provider"]
    generator = generation / "image_asset_generator"
    manifest_hash = sha256(files["generatedManifest"])

    check(isinstance(manifest, list) and len(manifest) == 53, "manifest must contain 53 entries")
    same_set([entry.get("name") for entry in manifest or []], names, "manifest names")
    request_by_name: dict[str, str] = {}
    source_by_name: dict[str, Path] = {}
    metadata_by_name: dict[str, Path] = {}
    derived_ids: list[str] = []
    for entry in manifest or []:
        name = entry.get("name")
        expected = by_name.get(name)
        if not expected:
            continue
        check(entry.get("status") == "generated" and entry.get("renderer") == "provider", f"manifest/{name}: provider status mismatch")
        prompt = str(entry.get("prompt", "")).lower()
        for marker in (contract.get("spatialCanon") or {}).get(name, []):
            check(marker in prompt, f"manifest/{name}: missing canon marker {marker}")
        sizes = [value for value in entry.get("sizes", []) if isinstance(value, int) and value > 0]
        template = entry.get("path_template")
        check(bool(sizes) and isinstance(template, str) and "{size}" in template, f"manifest/{name}: invalid path template")
        if not sizes or not isinstance(template, str):
            continue
        source = inside(generator, template.replace("{size}", str(max(sizes))), f"manifest/{name}/source")
        metadata_file = Path(f"{source}.render.json")
        regular(source, f"manifest/{name}/source")
        regular(metadata_file, f"manifest/{name}/metadata")
        source_by_name[name] = source
        metadata_by_name[name] = metadata_file
        metadata = read_json(metadata_file, f"manifest/{name}/metadata") or {}
        details = metadata.get("metadata") if isinstance(metadata.get("metadata"), dict) else {}
        check(metadata.get("renderer") == "provider", f"manifest/{name}: metadata renderer mismatch")
        if expected["sourceMode"] == "derived-provider":
            inherited = details.get("source_provider_request_ids")
            check(details.get("provider") == "derived-provider" and isinstance(inherited, list) and bool(inherited), f"manifest/{name}: derived provenance missing")
            same_set(inherited or [], (entry.get("derivation") or {}).get("sourceProviderRequestIds") or [], f"manifest/{name}: derived request IDs")
            derived_ids.extend(inherited or [])
        else:
            request_id = details.get("provider_request_id")
            check(details.get("provider") == "openai", f"manifest/{name}: provider must be openai")
            check(isinstance(details.get("provider_model"), str) and len(details["provider_model"]) > 3, f"manifest/{name}: model missing")
            check(isinstance(request_id, str) and len(request_id) > 8, f"manifest/{name}: request ID missing")
            if isinstance(request_id, str):
                request_by_name[name] = request_id
    direct_ids = set(request_by_name.values())
    check(len(request_by_name) == 48 and len(direct_ids) == 48, "direct request IDs must be 48 unique values")
    check(request_by_name.get("home_threshold_main") == contract["seedProviderRequestId"], "Home seed request mismatch")
    for request_id in derived_ids:
        check(request_id in direct_ids, f"derived provenance references unknown request {request_id}")

    check(forge.get("schemaVersion") == "2.0.0" and forge.get("version") == "v1" and forge.get("status") == "passed" and forge.get("forgeExitCode") == 0, "forge receipt status mismatch")
    check((forge.get("expectedOutputs"), forge.get("ready"), forge.get("generated"), forge.get("completed"), forge.get("missing")) == (53, 53, 53, 53, 0), "forge counts mismatch")
    check((forge.get("directProviderOutputs"), forge.get("reusedProviderOutputs"), forge.get("newProviderCalls"), forge.get("derivedProviderOutputs")) == (48, 1, 47, 5), "forge provider counts mismatch")
    check(forge.get("seedProviderRequestId") == contract["seedProviderRequestId"] and forge.get("manifestSha256") == manifest_hash and forge.get("promotion") is False, "forge provenance mismatch")
    check(float(forge.get("reservedEstimatedCostUsd", 999)) <= 47, "forge exposure exceeds ceiling")

    quality_assets = quality.get("assets") if isinstance(quality.get("assets"), list) else []
    check(quality.get("schemaVersion") == "2.1.0" and quality.get("status") == "passed" and quality.get("failed") == 0 and quality.get("passed") == 53, "quality status mismatch")
    check(quality.get("requireProvider") is True and quality.get("providerBacked") == 53 and quality.get("directProvider") == 48 and quality.get("derivedProvider") == 5, "quality provider counts mismatch")
    check(len(quality_assets) == 53 and all(item.get("status") == "passed" for item in quality_assets), "quality assets incomplete")
    same_set([item.get("name") for item in quality_assets], names, "quality names")

    check(dropin.get("schemaVersion") == "1.0.0" and dropin.get("version") == "v1" and dropin.get("status") == "certified", "drop-in status mismatch")
    check(dropin.get("expectedOutputs") == 53 and dropin.get("ready") == 53 and dropin.get("missing") == 0 and dropin.get("targetRepo") == contract["consumer"], "drop-in counts mismatch")
    check(dropin.get("manifestSha256") == manifest_hash, "drop-in manifest hash mismatch")

    attempts = budget.get("attempts") if isinstance(budget.get("attempts"), list) else []
    check(budget.get("schemaVersion") == "1.1.0" and isinstance(budget.get("runId"), str), "budget identity mismatch")
    check(budget.get("providerCallsExecuted") == 47 and float(budget.get("reservedEstimatedCostUsd", -1)) == 47 and len(attempts) == 47, "budget counts mismatch")
    ledger: dict[str, str] = {}
    for number, attempt in enumerate(attempts, 1):
        asset = attempt.get("asset")
        request_id = attempt.get("providerRequestId")
        check(attempt.get("attemptId") == f"{budget.get('runId')}:{number}" and attempt.get("callNumber") == number, f"budget/{number}: sequence mismatch")
        check(attempt.get("status") == "succeeded" and not attempt.get("error"), f"budget/{number}: failed")
        check(attempt.get("provider") == "openai", f"budget/{number}: provider mismatch")
        check(float(attempt.get("reservedUnitCostUsd", 0)) == 1 and float(attempt.get("reservedCumulativeCostUsd", 0)) == number, f"budget/{number}: cost mismatch")
        check(re.fullmatch(r"\d+x\d+", str(attempt.get("requestSize", ""))) is not None, f"budget/{number}: size mismatch")
        check(asset in new_names and asset not in ledger, f"budget/{number}: asset mismatch")
        check(request_id == request_by_name.get(asset), f"budget/{number}: request does not match {asset}")
        if isinstance(asset, str) and isinstance(request_id, str):
            ledger[asset] = request_id
    same_set(ledger, new_names, "budget asset names")
    check(len(set(ledger.values())) == 47, "budget request IDs are not unique")

    check(handoff.get("schemaVersion") == "3.0.0" and handoff.get("version") == "v1", "handoff identity mismatch")
    check((handoff.get("producer"), handoff.get("consumer")) == (contract["producer"], contract["consumer"]), "handoff repository mismatch")
    check(handoff.get("expectedOutputs") == 53 and handoff.get("ready") == 53 and handoff.get("missing") == 0, "handoff counts mismatch")
    check(handoff.get("assetPrefix") == contract["assetPrefix"] and handoff.get("copyRoot") == contract["copyRoot"] and handoff.get("providerRequired") is True and handoff.get("activationMode") == "atomic-complete-pack", "handoff authority mismatch")
    check(handoff.get("sourceBinding") == "lossless-webp-decoded-pixel-sha256", "handoff source binding mismatch")
    check(handoff.get("sourceManifestSha256") == manifest_hash, "handoff manifest hash mismatch")
    check(sha256(files["versionedHandoffManifest"]) == sha256(files["genericHandoffManifest"]) and handoff == generic, "generic/versioned handoff mismatch")
    handoff_assets = handoff.get("assets") if isinstance(handoff.get("assets"), list) else []
    check(len(handoff_assets) == 53, "handoff assets incomplete")
    same_set([asset.get("name") for asset in handoff_assets], names, "handoff names")
    same_set([asset.get("canonicalPath") for asset in handoff_assets], paths, "handoff paths")
    handoff_by_name = {asset.get("name"): asset for asset in handoff_assets}
    for expected in assets:
        name = expected["name"]
        asset = handoff_by_name.get(name) or {}
        source = source_by_name.get(name)
        metadata_file = metadata_by_name.get(name)
        if not source or not metadata_file:
            continue
        check(asset.get("status") == "ready" and asset.get("renderer") == "provider" and asset.get("canonicalPath") == expected["canonicalPath"], f"handoff/{name}: readiness mismatch")
        check(isinstance(asset.get("bytes"), int) and asset["bytes"] > 0 and is_sha(asset.get("sha256")), f"handoff/{name}: file receipt malformed")
        check(asset.get("sourcePath") == source.relative_to(generator).as_posix(), f"handoff/{name}: source path mismatch")
        check(asset.get("sourceSha256") == sha256(source), f"handoff/{name}: source hash mismatch")
        check(asset.get("sourceMetadataSha256") == sha256(metadata_file), f"handoff/{name}: metadata hash mismatch")
        check(is_sha(asset.get("sourcePixelSha256")) and asset.get("sourcePixelSha256") == asset.get("handoffPixelSha256"), f"handoff/{name}: pixel binding mismatch")
        check(asset.get("encoding") == {"format": "WEBP", "lossless": True, "method": 6}, f"handoff/{name}: encoding mismatch")
        if expected["sourceMode"] == "derived-provider":
            metadata = read_json(metadata_file, f"handoff/{name}/metadata") or {}
            same_set(asset.get("sourceProviderRequestIds") or [], (metadata.get("metadata") or {}).get("source_provider_request_ids") or [], f"handoff/{name}: derived IDs")
        else:
            check(asset.get("providerRequestId") == request_by_name.get(name), f"handoff/{name}: provider request mismatch")
        handoff_file = inside(files["handoffRoot"], expected["canonicalPath"], f"handoff/{name}")
        if regular(handoff_file, f"handoff/{name}"):
            check(handoff_file.stat().st_size == asset.get("bytes") and sha256(handoff_file) == str(asset.get("sha256", "")).lower(), f"handoff/{name}: bytes/hash mismatch")

    webps = [file.relative_to(files["handoffRoot"]).as_posix() for file in (files["handoffRoot"] / "assets/urai").rglob("*.webp")]
    same_set(webps, paths, "handoff WebP inventory")
    check(dropin.get("handoffManifestSha256") == sha256(files["versionedHandoffManifest"]), "drop-in handoff hash mismatch")

    check(post.get("schemaVersion") == "1.1.0" and post.get("status") == "passed" and post.get("sourceHeadSha") == contract["authorizedMarkerSha"], "post-certification identity mismatch")
    check(post.get("sourceBinding") == "lossless-webp-decoded-pixel-sha256", "post-certification binding mismatch")
    check(post.get("directProviderAssetsChecked") == 48 and post.get("handoffAssetsChecked") == 53, "post-certification counts mismatch")
    check(isinstance(post.get("duplicatePairs"), list) and not post["duplicatePairs"], "post-certification duplicates found")
    proofs = post.get("handoffAssets") if isinstance(post.get("handoffAssets"), list) else []
    check(len(proofs) == 53, "post-certification handoff proofs incomplete")
    same_set([proof.get("name") for proof in proofs], names, "post-certification handoff names")
    proof_by_name = {proof.get("name"): proof for proof in proofs}
    for expected in assets:
        name = expected["name"]
        proof = proof_by_name.get(name) or {}
        handoff_asset = handoff_by_name.get(name) or {}
        source = source_by_name.get(name)
        metadata_file = metadata_by_name.get(name)
        if not source or not metadata_file:
            continue
        check(proof.get("sourceSha256") == sha256(source) == handoff_asset.get("sourceSha256"), f"post/{name}: source hash mismatch")
        check(proof.get("sourceMetadataSha256") == sha256(metadata_file) == handoff_asset.get("sourceMetadataSha256"), f"post/{name}: metadata hash mismatch")
        check(proof.get("sourcePixelSha256") == handoff_asset.get("sourcePixelSha256") == proof.get("handoffPixelSha256") == handoff_asset.get("handoffPixelSha256"), f"post/{name}: pixel mismatch")
        handoff_file = inside(files["handoffRoot"], expected["canonicalPath"], f"post/{name}/handoff")
        check(proof.get("handoffSha256") == sha256(handoff_file) == handoff_asset.get("sha256"), f"post/{name}: handoff hash mismatch")
        check(proof.get("canonicalPath") == expected["canonicalPath"], f"post/{name}: path mismatch")

    direct_proofs = post.get("assets") if isinstance(post.get("assets"), list) else []
    check(len(direct_proofs) == 48, "post-certification direct proofs incomplete")
    same_set([proof.get("name") for proof in direct_proofs], direct_names, "post-certification direct names")
    post_ids: set[str] = set()
    for proof in direct_proofs:
        name = proof.get("name")
        source = source_by_name.get(name)
        check(proof.get("providerRequestId") == request_by_name.get(name), f"post/{name}: request mismatch")
        check(is_sha(proof.get("sourceSha256")) and is_sha(proof.get("perceptualHash")), f"post/{name}: hash malformed")
        if source:
            check(sha256(source) == str(proof.get("sourceSha256", "")).lower(), f"post/{name}: source hash mismatch")
        if isinstance(proof.get("providerRequestId"), str):
            post_ids.add(proof["providerRequestId"])
    same_set(post_ids, request_by_name.values(), "post-certification request IDs")
    check(len(post_ids) == 48, "post-certification request IDs not unique")

    NOTES.append("Certified all 53 assets without copying or activating them.")
    NOTES.append("Verified lossless source binding, exact paid-call provenance, and zero near-duplicate pairs.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contract-only", action="store_true")
    parser.add_argument("--generation-root")
    parser.add_argument("--post-certification-root")
    parser.add_argument("--report")
    args = parser.parse_args()

    report_destination = safe_report(args.report)
    contract = read_json(CONTRACT_FILE, "contract")
    if not isinstance(contract, dict):
        contract = {}
    assets = verify_contract(contract)
    if args.contract_only:
        NOTES.append("Contract and registry verified; no asset state changed.")
    else:
        check(bool(args.generation_root and args.post_certification_root), "artifact mode requires both artifact roots")
        if not ERRORS:
            verify_artifacts(contract, assets, args.generation_root, args.post_certification_root)

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
    if report_destination and not any(error.startswith("report path") for error in ERRORS):
        report_destination.parent.mkdir(parents=True, exist_ok=True)
        check(not report_destination.parent.is_symlink(), "report parent must be a real directory")
        if not ERRORS:
            report_destination.write_text(output, encoding="utf-8")
    sys.stdout.write(json.dumps({**report, "status": "failed" if ERRORS else "passed", "errors": ERRORS}, indent=2) + "\n")
    return 1 if ERRORS else 0


if __name__ == "__main__":
    raise SystemExit(main())
