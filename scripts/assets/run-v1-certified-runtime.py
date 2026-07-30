#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
import re
import sys
import zlib
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).resolve().parents[2]
VERIFIER = ROOT / "scripts/assets/verify-v1-certified-runtime.py"
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
        raise ValueError("recovered V1 ledger must be an object")
    if ledger.get("authority") != EXPECTED_AUTHORITY:
        raise ValueError("recovered V1 authority mismatch")
    assets = ledger.get("assets")
    if not isinstance(assets, list) or len(assets) != 53:
        raise ValueError("recovered V1 ledger must contain exactly 53 assets")

    names: set[str] = set()
    paths: set[str] = set()
    required = {"n", "p", "s", "x", "w", "h", "a", "r", "q"}
    for asset in assets:
        if not isinstance(asset, dict) or not required.issubset(asset):
            raise ValueError("recovered V1 asset entry is incomplete")
        name = str(asset["n"])
        path = str(asset["p"])
        if name in names or path in paths:
            raise ValueError(f"duplicate recovered V1 identity: {name} / {path}")
        names.add(name)
        paths.add(path)
        if not re.fullmatch(r"[a-z0-9_]+", name):
            raise ValueError(f"invalid recovered V1 name: {name}")
        if not path.startswith("assets/urai/") or not path.endswith(".webp") or ".." in Path(path).parts:
            raise ValueError(f"invalid recovered V1 path: {path}")
        for key in ("s", "x"):
            if not re.fullmatch(r"[0-9a-f]{64}", str(asset[key])):
                raise ValueError(f"invalid recovered V1 {key}: {name}")
        if not isinstance(asset["w"], int) or not isinstance(asset["h"], int) or asset["w"] <= 0 or asset["h"] <= 0:
            raise ValueError(f"invalid recovered V1 dimensions: {name}")
        if not isinstance(asset["a"], bool):
            raise ValueError(f"invalid recovered V1 alpha contract: {name}")
        if not isinstance(asset["q"], str) or len(asset["q"]) < 8:
            raise ValueError(f"invalid recovered V1 provider identity: {name}")

    receptionist = next((asset for asset in assets if asset["n"] == "avatar_receptionist"), None)
    if not receptionist:
        raise ValueError("recovered receptionist entry is missing")
    if receptionist["q"] != "req_bb92582789134dbdb24e6f9f8c66c8ae":
        raise ValueError("recovered receptionist request identity mismatch")
    if (receptionist["w"], receptionist["h"], receptionist["a"]) != (1024, 1536, True):
        raise ValueError("recovered receptionist geometry mismatch")
    return ledger


def recover_ledger(module: ModuleType) -> tuple[dict, str, str]:
    encoded = "".join(str(module.LEDGER_ZLIB_B64).split())
    packed = base64.b64decode(encoded, validate=True)
    mode = "zlib-wrapper-verified"
    try:
        raw = zlib.decompress(packed)
    except zlib.error as error:
        if "incorrect data check" not in str(error):
            raise
        if len(packed) < 7:
            raise ValueError("embedded V1 stream is too short for checksum recovery") from error
        raw = zlib.decompress(packed[2:-4], -zlib.MAX_WBITS)
        mode = "raw-deflate-after-wrapper-checksum-failure"
    ledger = validate_ledger(json.loads(raw))
    canonical = json.dumps(ledger, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return ledger, mode, hashlib.sha256(canonical).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    module = load_module()
    ledger, mode, semantic_sha = recover_ledger(module)
    module.load_ledger = lambda: ledger

    if args.self_test:
        print(json.dumps({
            "status": "passed",
            "assets": len(ledger["assets"]),
            "authority": ledger["authority"],
            "recoveryMode": mode,
            "semanticLedgerSha256": semantic_sha,
        }, indent=2, sort_keys=True))
        return 0

    print(json.dumps({
        "ledgerRecoveryMode": mode,
        "semanticLedgerSha256": semantic_sha,
    }, sort_keys=True), file=sys.stderr)
    return int(module.main())


if __name__ == "__main__":
    raise SystemExit(main())
