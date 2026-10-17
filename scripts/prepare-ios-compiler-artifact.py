"""Retain actual unprovisioned iOS compiler outputs; no runtime or device acceptance."""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import re
import subprocess
import sys
import zipfile

PART_BYTES = 24 * 1024 * 1024
CAPACITOR_REVISION = "0b6882e9a3288342aacf36348e5a94e4f1dd7b13"


def require(value, reason):
    if not value:
        raise ValueError("IOS_COMPILER_ARTIFACT_" + reason)


def digest(file):
    value = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for option in ("app", "package-lock", "xcode-version-file", "sdk-version-file", "compile-log", "output-directory"):
        parser.add_argument("--" + option, type=Path, required=True)
    for option in ("source-sha", "workflow-run-id", "sdk"):
        parser.add_argument("--" + option, required=True)
    args = parser.parse_args()
    require(re.fullmatch(r"[0-9a-f]{40}", args.source_sha), "EXACT_SOURCE_REQUIRED")
    require(re.fullmatch(r"[1-9][0-9]*", args.workflow_run_id), "RUN_REQUIRED")
    require(args.sdk in ("iphoneos", "iphonesimulator"), "SDK_REQUIRED")
    require(args.app.is_dir() and not args.app.is_symlink(), "APP_REQUIRED")
    info = plistlib.loads((args.app / "Info.plist").read_bytes())
    require(info.get("CFBundleIdentifier") == "com.urailabs.urai" and info.get("DTPlatformName") == args.sdk, "PLATFORM_MISMATCH")
    executable = args.app / info["CFBundleExecutable"]
    require(executable.is_file() and not executable.is_symlink(), "EXECUTABLE_REQUIRED")
    with executable.open("rb") as stream:
        require(stream.read(4) in [bytes.fromhex(value) for value in ("cffaedfe", "feedfacf", "cafebabe", "bebafeca")], "MACHO_REQUIRED")
    xcode = args.xcode_version_file.read_text()
    version = re.search(r"Xcode (\d+)", xcode)
    require(version and int(version.group(1)) >= 26, "XCODE_26_REQUIRED")
    lock = json.loads(args.package_lock.read_text())
    pins = lock.get("pins", lock.get("object", {}).get("pins", []))
    core = [pin for pin in pins if pin.get("identity", pin.get("package", "")).lower() == "capacitor-swift-pm"]
    require(len(core) == 1 and core[0].get("state", {}).get("version") == "8.5.2" and core[0].get("state", {}).get("revision") == CAPACITOR_REVISION, "DEPENDENCY_LOCK_MISMATCH")
    web = args.app / "public"
    fingerprint = json.loads((web / "native-build-fingerprint.json").read_text())
    require(fingerprint.get("sourceSha") == args.source_sha and fingerprint.get("workflowRunId") == args.workflow_run_id and fingerprint.get("platform") == "ios" and fingerprint.get("firebaseProject") == "urai-4dc1d" and fingerprint.get("physicalDeviceAcceptance") is False, "STATIC_IDENTITY_MISMATCH")
    require(digest(web / "index.html") == fingerprint.get("htmlSha256") and digest(web / "api/system/deploy-proof") == fingerprint.get("deployProofSha256"), "STATIC_BYTES_MISMATCH")
    inspection = subprocess.run(["codesign", "--display", "--verbose=2", str(args.app)], text=True, capture_output=True)
    observed = inspection.stdout + inspection.stderr
    require("Authority=" not in observed and ("TeamIdentifier=not set" in observed or "TeamIdentifier=" not in observed), "UNEXPECTED_TEAM_AUTHORITY")
    files = {}
    for file in sorted(args.app.rglob("*")):
        require(not file.is_symlink(), "SYMLINK_REJECTED")
        if file.is_file():
            files[args.app.name + "/" + file.relative_to(args.app).as_posix()] = file
    for name, file in (("Package.resolved", args.package_lock), ("xcode-version.txt", args.xcode_version_file), ("sdk-version.txt", args.sdk_version_file), ("xcodebuild.log", args.compile_log)):
        require(file.is_file() and not file.is_symlink(), "EVIDENCE_REQUIRED")
        files[name] = file
    receipt = {
        "schemaVersion": "urai-ios-native-compiler-artifact-v1", "repository": "LifeLoggerAI/urai-spatial",
        "sourceSha": args.source_sha, "workflowRunId": args.workflow_run_id, "sdk": args.sdk,
        "sdkVersion": args.sdk_version_file.read_text().strip(), "xcode": xcode.strip(),
        "bundleIdentifier": info["CFBundleIdentifier"], "bundleVersion": info.get("CFBundleVersion"),
        "bundleShortVersion": info.get("CFBundleShortVersionString"), "executableSha256": digest(executable),
        "compiled": True, "codeSigningAllowed": False, "signingPerformedByWorkflow": False,
        "observedApplicationSignature": "linker-ad-hoc" if inspection.returncode == 0 else "unsigned",
        "codeSignInspection": observed, "appleTeamAuthority": False, "provisionedForDistribution": False,
        "physicalDeviceAcceptance": False, "simulatorRuntimeAcceptance": False,
        "nativeProviderRuntimeAcceptance": False, "storeAcceptance": False,
        "capacitorSpmVersion": "8.5.2", "capacitorSpmRevision": CAPACITOR_REVISION,
        "localCapacitorAppVersion": "8.1.2", "staticFingerprint": fingerprint,
        "files": [{"path": name, "sizeBytes": file.stat().st_size, "sha256": digest(file)} for name, file in sorted(files.items())],
    }
    args.output_directory.mkdir(parents=True, exist_ok=True)
    require(not args.output_directory.is_symlink() and not any(args.output_directory.iterdir()), "OUTPUT_NOT_EMPTY")
    archive = args.output_directory / f"urai-ios-{args.sdk}-compiler.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
        for name, file in sorted(files.items()):
            bundle.write(file, name)
        bundle.writestr("ios-native-compiler-receipt.json", json.dumps(receipt, indent=2) + "\n")
    with zipfile.ZipFile(archive) as bundle:
        require(bundle.testzip() is None, "CRC_MISMATCH")
    parts = []
    with archive.open("rb") as stream:
        for index, contents in enumerate(iter(lambda: stream.read(PART_BYTES), b""), 1):
            name = archive.name + f".part-{index:02d}"
            part = args.output_directory / name
            part.write_bytes(contents)
            parts.append({"index": index, "name": name, "sizeBytes": len(contents), "sha256": digest(part)})
    require(len(parts) <= 8, "PART_BUDGET")
    transport = {
        "schemaVersion": "urai-ios-compiler-transport-v1", "sourceSha": args.source_sha,
        "workflowRunId": args.workflow_run_id, "sdk": args.sdk, "compiled": True,
        "physicalDeviceAcceptance": False, "archiveName": archive.name,
        "archiveSizeBytes": archive.stat().st_size, "archiveSha256": digest(archive),
        "partBytes": PART_BYTES, "parts": parts,
    }
    (args.output_directory / "ios-native-compiler-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    (args.output_directory / "ios-compiler-transport.json").write_text(json.dumps(transport, indent=2) + "\n")
    print(json.dumps({key: value for key, value in transport.items() if key != "parts"}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
