#!/usr/bin/env python3
"""Offline content proof for a captured Firebase Functions source ZIP.

This verifies bytes of a real local archive against a clean reviewed checkout and
its generated Functions output. It does NOT verify who uploaded it, the GCS
object generation, the Cloud Build identity or the deployed Cloud Run revision.
"""
import argparse
import hashlib
import json
import os
import re
import stat
import subprocess
import zipfile
from pathlib import Path, PurePosixPath

MAX_ARCHIVE_BYTES = 128 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 256 * 1024 * 1024
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_FILES = 5000
IGNORED_DIRS = {'.git', 'node_modules'}
REQUIRED = {'package.json', 'src/index.ts', 'lib/apps/functions/src/index.js'}

class SourceArchiveError(ValueError):
    pass


def fail(code):
    raise SourceArchiveError('FUNCTIONS_ARCHIVE_' + code)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git(root, *args):
    try:
        return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.DEVNULL, timeout=8).decode().strip()
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        fail('CHECKOUT_UNAVAILABLE')


def valid_name(name, directory=False):
    if not isinstance(name, str) or not name or len(name) > 512 or '\\' in name or '\x00' in name:
        fail('ENTRY_PATH_UNSAFE')
    parts = name.rstrip('/').split('/')
    if any(p in ('', '.', '..') or any(ord(c) < 32 for c in p) for p in parts):
        fail('ENTRY_PATH_UNSAFE')
    if name.startswith('/') or str(PurePosixPath(name.rstrip('/'))) != name.rstrip('/'):
        fail('ENTRY_PATH_UNSAFE')
    if directory != name.endswith('/'):
        fail('ENTRY_PATH_UNSAFE')
    return name.rstrip('/')


def inspected_files(source):
    files = {}
    for current, dirs, names in os.walk(source, topdown=True, followlinks=False):
        dirs[:] = [d for d in sorted(dirs) if d not in IGNORED_DIRS]
        for d in dirs:
            if (Path(current) / d).is_symlink():
                fail('SOURCE_SYMLINK')
        for name in sorted(names):
            p = Path(current) / name
            if p.is_symlink() or not p.is_file():
                fail('SOURCE_NONREGULAR')
            rel = p.relative_to(source).as_posix()
            if rel == '.runtimeconfig.json' or rel.startswith('firebase-debug'):
                # Firebase may synthesize .runtimeconfig.json; source claim may
                # never include it without a separately verified config digest.
                continue
            valid_name(rel)
            size = p.stat().st_size
            if size > MAX_FILE_BYTES:
                fail('SOURCE_TOO_LARGE')
            files[rel] = (size, digest(p.read_bytes()))
            if len(files) > MAX_FILES:
                fail('SOURCE_TOO_MANY_FILES')
    return files


def inspect_archive(repo_root, source_dir, archive_path, expected_sha):
    root = Path(repo_root).resolve(strict=True)
    source = Path(source_dir).resolve(strict=True)
    archive = Path(archive_path).resolve(strict=True)
    if source != root / 'apps/functions' or archive == source or source in archive.parents:
        fail('BOUNDARY_MISMATCH')
    if not re.fullmatch('[a-f0-9]{40}', expected_sha or '') or git(root, 'rev-parse', 'HEAD') != expected_sha:
        fail('EXACT_SHA_MISMATCH')
    if git(root, 'status', '--porcelain', '--untracked-files=no'):
        fail('DIRTY_CHECKOUT')
    if git(root, 'remote', 'get-url', 'origin') not in (
        'https://github.com/LifeLoggerAI/urai-spatial',
        'https://github.com/LifeLoggerAI/urai-spatial.git',
    ):
        fail('REPOSITORY_MISMATCH')
    try:
        cfg = json.loads((root / 'firebase.json').read_text(encoding='utf-8'))
        if cfg.get('functions', {}).get('source') != 'apps/functions':
            fail('CONFIG_SOURCE_MISMATCH')
    except (OSError, json.JSONDecodeError, AttributeError):
        fail('CONFIG_INVALID')
    if not archive.is_file() or archive.stat().st_size > MAX_ARCHIVE_BYTES:
        fail('ARCHIVE_TOO_LARGE')
    source_files = inspected_files(source)
    if sum(size for size, _ in source_files.values()) > MAX_UNCOMPRESSED_BYTES:
        fail('SOURCE_TOO_LARGE')
    if not REQUIRED.issubset(source_files):
        fail('REQUIRED_SOURCE_MISSING')
    archived = {}
    total = 0
    try:
        with zipfile.ZipFile(archive) as z:
            infos = z.infolist()
            if len(infos) > MAX_FILES * 2:
                fail('TOO_MANY_ENTRIES')
            seen = set()
            for entry in infos:
                name = valid_name(entry.filename, entry.is_dir())
                if name in seen:
                    fail('DUPLICATE_ENTRY')
                seen.add(name)
                mode = entry.external_attr >> 16
                if stat.S_IFMT(mode) not in (0, stat.S_IFDIR if entry.is_dir() else stat.S_IFREG):
                    fail('ARCHIVE_NONREGULAR')
                if entry.is_dir():
                    continue
                if name == '.runtimeconfig.json':
                    fail('UNBOUND_RUNTIME_CONFIG')
                if entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                    fail('UNSUPPORTED_COMPRESSION')
                if entry.flag_bits & 1 or entry.file_size > MAX_FILE_BYTES:
                    fail('ENTRY_INVALID')
                total += entry.file_size
                if total > MAX_UNCOMPRESSED_BYTES:
                    fail('UNCOMPRESSED_TOO_LARGE')
                archived[name] = (entry.file_size, digest(z.read(entry)))
    except (zipfile.BadZipFile, EOFError, RuntimeError, OSError):
        fail('ARCHIVE_CORRUPT')
    if set(source_files) != set(archived):
        fail('FILE_SET_MISMATCH')
    if any(archived[name] != identity for name, identity in source_files.items()):
        fail('FILE_DIGEST_MISMATCH')
    content_lines = ''.join(f'{name}\t{size}\t{hexdigest}\n' for name, (size, hexdigest) in sorted(archived.items()))
    return {
        'schema': 'urai-local-functions-archive-content-v1',
        'status': 'OFFLINE_PACKAGE_BYTES_MATCH_ONLY',
        'repository': 'LifeLoggerAI/urai-spatial',
        'checkoutSha': expected_sha,
        'trackedFunctionsTree': git(root, 'rev-parse', 'HEAD:apps/functions'),
        'archiveSha256': digest(archive.read_bytes()),
        'entryManifestSha256': digest(content_lines.encode()),
        'verifiedFileCount': len(archived),
        'packagedDependencyLockPresent': 'package-lock.json' in archived or 'pnpm-lock.yaml' in archived,
        'trustedUploadVerified': False,
        'cloudStorageGenerationVerified': False,
        'cloudBuildVerified': False,
        'servingRevisionVerified': False,
        'stagingAdmission': False,
        'productionAcceptance': False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root', required=True)
    parser.add_argument('--source-dir', required=True)
    parser.add_argument('--archive', required=True)
    parser.add_argument('--expected-sha', required=True)
    args = parser.parse_args()
    try:
        evidence = inspect_archive(args.repo_root, args.source_dir, args.archive, args.expected_sha)
        print(json.dumps(evidence, sort_keys=True))
    except (SourceArchiveError, OSError) as exc:
        parser.exit(2, f'{exc}\n')


if __name__ == '__main__':
    main()
