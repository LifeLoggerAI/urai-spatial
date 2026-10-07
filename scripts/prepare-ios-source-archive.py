"""Retain a complete generated iOS project. This never compiles or signs an app."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import zipfile

PREFIX = "distribution/ios-shell/ios/"
INDEX = "ios-source-project-index.json"
PART_BYTES = 24 * 1024 * 1024
CRITICAL = (
    "App/App.xcodeproj/project.pbxproj", "App/CapApp-SPM/Package.swift",
    "App/App/AppDelegate.swift", "App/App/SceneDelegate.swift", "App/App/Info.plist",
    "App/App/App.entitlements", "App/App/Assets.xcassets/AppIcon.appiconset/Contents.json",
    "App/App/public/index.html", "App/App/public/api/system/deploy-proof",
    "App/App/public/native-build-fingerprint.json",
)
FLAGS = ("compiled", "signingPerformed", "appleAuthoritySupplied",
         "nativeAppleAuthConfigured", "nativeGoogleAuthConfigured")


def require(condition, reason):
    if not condition:
        raise ValueError("IOS_SOURCE_ARCHIVE_" + reason)


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha_file(file):
    digest = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_name(name):
    return (isinstance(name, str) and bool(name) and "\\" not in name
            and not name.startswith("/") and
            all(part not in ("", ".", "..") for part in name.split("/"))
            and ":" not in name)


def regular(file):
    require(file.is_file() and not file.is_symlink(), "REGULAR_FILE_REQUIRED")


def exact_source(source):
    require(bool(re.fullmatch(r"[0-9a-f]{40}", source or "")), "EXACT_SOURCE_REQUIRED")


def verify_identity(read, source, run):
    receipt = json.loads(read("ios-source-receipt.json"))
    require(receipt.get("sourceSha") == source and all(receipt.get(flag) is False for flag in FLAGS),
            "SOURCE_ONLY_RECEIPT_REQUIRED")
    web = PREFIX + "App/App/public/"
    fingerprint = json.loads(read(web + "native-build-fingerprint.json"))
    require(fingerprint.get("sourceSha") == source and fingerprint.get("platform") == "ios"
            and fingerprint.get("workflowRunId") == str(run)
            and fingerprint.get("firebaseProject") == "urai-4dc1d"
            and all(fingerprint.get(flag) is False for flag in
                    ("nativeAcceptance", "physicalDeviceAcceptance", "productionAcceptance")),
            "FINGERPRINT_IDENTITY_MISMATCH")
    html = read(web + "index.html")
    proof = read(web + "api/system/deploy-proof")
    require(fingerprint.get("htmlSha256") == sha_bytes(html)
            and fingerprint.get("deployProofSha256") == sha_bytes(proof),
            "STATIC_BYTES_MISMATCH")
    identity = json.loads(proof)
    require(identity.get("repository") == "LifeLoggerAI/urai-spatial"
            and identity.get("environment", {}).get("firebaseProject") == "urai-4dc1d"
            and identity.get("environment", {}).get("commitSha") == source
            and identity.get("deploymentFreshness", {}).get("commitSha") == source
            and identity.get("deploymentFreshness", {}).get("commitShaKnown") is True,
            "STATIC_READBACK_MISMATCH")
    require(bool(re.search(rb'\bdata-deployed-sha=["\x27]' + source.encode() + rb'["\x27]', html)),
            "HTML_SOURCE_MISMATCH")


def verify_archive(archive, source):
    exact_source(source)
    regular(archive)
    with zipfile.ZipFile(archive) as bundle:
        infos = bundle.infolist()
        names = [entry.filename for entry in infos]
        require(len(names) == len(set(names)) and INDEX in names and len(names) <= 50000,
                "ENTRIES_INVALID")
        require(all(safe_name(entry.filename) and not entry.is_dir()
                    and entry.file_size <= 256 * 1024 * 1024
                    and not stat.S_ISLNK(entry.external_attr >> 16) for entry in infos),
                "ENTRY_UNSAFE")
        require(sum(entry.file_size for entry in infos) <= 2 * 1024 * 1024 * 1024,
                "EXPANSION_LIMIT")
        require(bundle.getinfo(INDEX).file_size <= 16 * 1024 * 1024, "INDEX_LIMIT")
        index = json.loads(bundle.read(INDEX))
        require(index.get("schemaVersion") == "urai-ios-full-source-index-v1"
                and index.get("sourceSha") == source and index.get("compiled") is False
                and index.get("signed") is False
                and re.fullmatch(r"[1-9][0-9]*", str(index.get("workflowRunId", ""))),
                "INDEX_IDENTITY_MISMATCH")
        files = index.get("files", [])
        require(isinstance(files, list) and all(isinstance(entry, dict) for entry in files),
                "INDEX_FILES_INVALID")
        require(set(names) == {INDEX, *[entry.get("path") for entry in files]}
                and len(files) == len(names) - 1, "INDEX_CONTENT_MISMATCH")
        require(all(PREFIX + name in names for name in CRITICAL), "INCOMPLETE_PROJECT")
        require(all(entry["path"].startswith(PREFIX) or entry["path"] == "ios-source-receipt.json"
                    for entry in files), "INDEX_PATH_INVALID")
        for entry in files:
            data = bundle.read(entry["path"])
            require(len(data) == entry.get("sizeBytes") and sha_bytes(data) == entry.get("sha256"),
                    "FILE_HASH_MISMATCH")
        verify_identity(bundle.read, source, index["workflowRunId"])
        require(bundle.testzip() is None, "CRC_MISMATCH")
    return index


def package(project, receipt, output, source, run):
    exact_source(source)
    require(re.fullmatch(r"[1-9][0-9]*", run or ""), "RUN_REQUIRED")
    require(project.is_dir() and not project.is_symlink(), "PROJECT_REQUIRED")
    regular(receipt)
    sources = {"ios-source-receipt.json": receipt}
    for file in sorted(project.rglob("*")):
        require(not file.is_symlink(), "SYMLINK_REJECTED")
        if file.is_file():
            regular(file)
            name = PREFIX + file.relative_to(project).as_posix()
            require(safe_name(name), "ENTRY_UNSAFE")
            sources[name] = file
    require(all(PREFIX + name in sources for name in CRITICAL), "INCOMPLETE_PROJECT")
    verify_identity(lambda name: sources[name].read_bytes(), source, run)
    output.mkdir(parents=True, exist_ok=True)
    require(not output.is_symlink(), "OUTPUT_UNSAFE")
    require(not any(output.iterdir()), "OUTPUT_NOT_EMPTY")
    index = {"schemaVersion": "urai-ios-full-source-index-v1",
             "repository": "LifeLoggerAI/urai-spatial", "sourceSha": source,
             "workflowRunId": run, "compiled": False, "signed": False,
             "nativeAcceptance": False, "physicalDeviceAcceptance": False,
             "files": [{"path": name, "sizeBytes": file.stat().st_size, "sha256": sha_file(file)}
                       for name, file in sorted(sources.items())]}
    archive = output / "urai-ios-project-source.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
        for name, file in sorted(sources.items()):
            bundle.write(file, name)
        bundle.writestr(INDEX, json.dumps(index, indent=2) + "\n")
    verify_archive(archive, source)
    parts = []
    with archive.open("rb") as stream:
        number = 1
        for data in iter(lambda: stream.read(PART_BYTES), b""):
            name = f"urai-ios-project-source.zip.part-{number:02d}"
            (output / name).write_bytes(data)
            parts.append({"name": name, "index": number, "sizeBytes": len(data), "sha256": sha_bytes(data)})
            number += 1
    transport = {"schemaVersion": "urai-ios-source-archive-transport-v1",
                 "repository": "LifeLoggerAI/urai-spatial", "sourceSha": source,
                 "workflowRunId": run, "archiveName": archive.name,
                 "archiveSizeBytes": archive.stat().st_size, "archiveSha256": sha_file(archive),
                 "partBytes": PART_BYTES, "parts": parts,
                 "compiled": False, "signed": False, "physicalDeviceAcceptance": False}
    (output / "ios-source-archive-transport.json").write_text(json.dumps(transport, indent=2) + "\n")
    return transport


def reconstruct(manifest, parts_directory, output, source):
    exact_source(source)
    regular(manifest)
    require(manifest.stat().st_size <= 256 * 1024, "TRANSPORT_LIMIT")
    transport = json.loads(manifest.read_text())
    require(transport.get("schemaVersion") == "urai-ios-source-archive-transport-v1"
            and transport.get("sourceSha") == source
            and transport.get("archiveName") == "urai-ios-project-source.zip"
            and transport.get("compiled") is False and transport.get("signed") is False
            and transport.get("partBytes") == PART_BYTES, "TRANSPORT_IDENTITY_MISMATCH")
    parts = transport.get("parts")
    require(isinstance(parts, list) and 0 < len(parts) <= 100, "TRANSPORT_PARTS_INVALID")
    require(not output.exists() and not output.is_symlink(), "OUTPUT_EXISTS")
    temporary = output.with_name(output.name + ".partial")
    require(not temporary.exists() and not temporary.is_symlink(), "OUTPUT_EXISTS")
    try:
        with temporary.open("xb") as stream:
            for number, entry in enumerate(parts, 1):
                require(entry.get("index") == number
                        and entry.get("name") == f"urai-ios-project-source.zip.part-{number:02d}"
                        and isinstance(entry.get("sizeBytes"), int)
                        and 0 < entry["sizeBytes"] <= PART_BYTES, "TRANSPORT_PART_INVALID")
                part = parts_directory / entry["name"]
                regular(part)
                require(part.stat().st_size == entry["sizeBytes"]
                        and sha_file(part) == entry.get("sha256"), "PART_HASH_MISMATCH")
                with part.open("rb") as contents:
                    for chunk in iter(lambda: contents.read(1024 * 1024), b""):
                        stream.write(chunk)
        require(temporary.stat().st_size == transport.get("archiveSizeBytes")
                and sha_file(temporary) == transport.get("archiveSha256"), "ARCHIVE_HASH_MISMATCH")
        index = verify_archive(temporary, source)
        require(index.get("workflowRunId") == transport.get("workflowRunId"), "RUN_MISMATCH")
        os.replace(temporary, output)
    finally:
        if temporary.exists():
            temporary.unlink()
    return transport


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    pack = commands.add_parser("package")
    pack.add_argument("--project", required=True, type=Path)
    pack.add_argument("--receipt", required=True, type=Path)
    pack.add_argument("--output-directory", required=True, type=Path)
    pack.add_argument("--workflow-run-id", required=True)
    rebuild = commands.add_parser("reconstruct")
    rebuild.add_argument("--manifest", required=True, type=Path)
    rebuild.add_argument("--parts-directory", required=True, type=Path)
    rebuild.add_argument("--output", required=True, type=Path)
    check = commands.add_parser("verify")
    check.add_argument("--archive", required=True, type=Path)
    for command in (pack, rebuild, check):
        command.add_argument("--source-sha", required=True)
    args = parser.parse_args()
    if args.command == "package":
        result = package(args.project, args.receipt, args.output_directory, args.source_sha, args.workflow_run_id)
    elif args.command == "reconstruct":
        result = reconstruct(args.manifest, args.parts_directory, args.output, args.source_sha)
    else:
        result = verify_archive(args.archive, args.source_sha)
    print(json.dumps({key: value for key, value in result.items() if key not in ("files", "parts")}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)

