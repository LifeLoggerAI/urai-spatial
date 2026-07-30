#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).resolve().parents[2]
VERIFIER = ROOT / "scripts/assets/verify-v1-certified-runtime.py"
LEDGER = ROOT / "artifacts/assets/v1-certified-runtime-ledger.json"
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


def load_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("v1_runtime_verifier", VERIFIER)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load verifier: {VERIFIER}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_ledger(ledger: object) -> dict:
    if not isinstance(ledger, dict):
        raise ValueError("rebuilt V1 ledger must be an object")
    if ledger.get("authority") != EXPECTED_AUTHORITY:
        raise ValueError("rebuilt V1 authority mismatch")
    if ledger.get("originalArtifactId") != 8741010314 or ledger.get("recoveryArtifactId") != 8742902079:
        raise ValueError("rebuilt V1 artifact identity mismatch")
    if ledger.get("originalAssetsUnchanged") != 52 or ledger.get("recoveredAssets") != ["avatar_receptionist"]:
        raise ValueError("rebuilt V1 retained/recovered boundary mismatch")
    assets = ledger.get("assets")
    if not isinstance(assets, list) or len(assets) != 53:
        raise ValueError("rebuilt V1 ledger must contain exactly 53 assets")

    names: set[str] = set()
    paths: set[str] = set()
    required = {"n", "p", "s", "x", "w", "h", "a", "r", "q", "srcSha256", "metadataSha256"}
    for asset in assets:
        if not isinstance(asset, dict) or not required.issubset(asset):
            raise ValueError("rebuilt V1 asset entry is incomplete")
        name = str(asset["n"])
        path = str(asset["p"])
        if name in names or path in paths:
            raise ValueError(f"duplicate rebuilt V1 identity: {name} / {path}")
        names.add(name)
        paths.add(path)
        if not re.fullmatch(r"[a-z0-9_]+", name):
            raise ValueError(f"invalid rebuilt V1 name: {name}")
        if not path.startswith("assets/urai/") or not path.endswith(".webp") or ".." in Path(path).parts:
            raise ValueError(f"invalid rebuilt V1 path: {path}")
        for key in ("s", "x", "srcSha256", "metadataSha256"):
            if not re.fullmatch(r"[0-9a-f]{64}", str(asset[key])):
                raise ValueError(f"invalid rebuilt V1 {key}: {name}")
        if not isinstance(asset["w"], int) or not isinstance(asset["h"], int) or asset["w"] <= 0 or asset["h"] <= 0:
            raise ValueError(f"invalid rebuilt V1 dimensions: {name}")
        if not isinstance(asset["a"], bool):
            raise ValueError(f"invalid rebuilt V1 alpha contract: {name}")
        if not isinstance(asset["q"], str) or len(asset["q"]) < 8:
            raise ValueError(f"invalid rebuilt V1 provider identity: {name}")

    receptionist = next((asset for asset in assets if asset["n"] == "avatar_receptionist"), None)
    if not receptionist:
        raise ValueError("rebuilt receptionist entry is missing")
    if receptionist["q"] != "req_bb92582789134dbdb24e6f9f8c66c8ae":
        raise ValueError("rebuilt receptionist request identity mismatch")
    if receptionist["srcSha256"] != "d95bb0f4b2703e32b8cb2295dc42a2f900a9eaf749a48a3c7f334ab4edc29c05":
        raise ValueError("rebuilt receptionist source hash mismatch")
    if (receptionist["w"], receptionist["h"], receptionist["a"]) != (1024, 1536, True):
        raise ValueError("rebuilt receptionist geometry mismatch")
    return ledger


def load_ledger() -> tuple[dict, str]:
    raw = LEDGER.read_bytes()
    ledger = validate_ledger(json.loads(raw))
    return ledger, hashlib.sha256(raw).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    module = load_module()
    ledger, ledger_sha = load_ledger()
    module.load_ledger = lambda: ledger

    if args.self_test:
        print(json.dumps({
            "status": "passed",
            "assets": len(ledger["assets"]),
            "authority": ledger["authority"],
            "ledgerSha256": ledger_sha,
        }, indent=2, sort_keys=True))
        return 0

    print(json.dumps({"ledgerSha256": ledger_sha}, sort_keys=True), file=sys.stderr)
    return int(module.main())


if __name__ == "__main__":
    raise SystemExit(main())
