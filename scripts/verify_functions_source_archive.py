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
import tarfile
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

MAX_ARCHIVE_BYTES = 128 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 256 * 1024 * 1024
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_FILES = 5000
IGNORED_DIRS = {'.git', 'node_modules'}
REQUIRED = {'package.json', 'src/index.ts', 'lib/apps/functions/src/index.js'}
GENERATED_SUFFIXES = ('.js', '.js.map', '.d.ts', '.d.ts.map')
PINNED_PNPM = '10.0.0'

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
            if rel == '.runtimeconfig.json':
                fail('UNBOUND_RUNTIME_CONFIG')
            if rel.startswith('firebase-debug'):
                # Debug outputs must never acquire reviewed package authority.
                fail('UNREVIEWED_SOURCE_FILE')
            valid_name(rel)
            size = p.stat().st_size
            if size > MAX_FILE_BYTES:
                fail('SOURCE_TOO_LARGE')
            files[rel] = (size, digest(p.read_bytes()))
            if len(files) > MAX_FILES:
                fail('SOURCE_TOO_MANY_FILES')
    return files


def tracked_blob_map(root, treeish, prefix):
    # Read the immutable HEAD tree, not the editable Git index or .gitignore.
    try:
        raw = subprocess.check_output(
            ['git', '-C', str(root), 'ls-tree', '-rz', '--full-tree', treeish, '--', prefix],
            stderr=subprocess.DEVNULL, timeout=12,
        )
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        fail('CHECKOUT_UNAVAILABLE')
    blobs = {}
    for row in raw.split(b'\x00'):
        if not row:
            continue
        try:
            header, pathname = row.split(b'\t', 1)
            mode, kind, sha = header.split(b' ')
            name = pathname.decode('utf-8')
        except (ValueError, UnicodeDecodeError):
            fail('GIT_TREE_INVALID')
        if kind != b'blob' or mode not in (b'100644', b'100755'):
            fail('GIT_TREE_NONREGULAR')
        blobs[name] = sha.decode('ascii')
    return blobs


def git_blob_sha(data):
    # SHA-1 is used only to compare with the exact tree object Git names;
    # SHA-256 remains the cryptographic archive/content digest in the receipt.
    return hashlib.sha1(b'blob ' + str(len(data)).encode('ascii') + b'\x00' + data).hexdigest()


def source_authority(root, source, source_files, expected_sha):
    tracked = tracked_blob_map(root, expected_sha, 'apps/functions')
    generated = {}
    count = 0
    for relative in sorted(source_files):
        git_path = 'apps/functions/' + relative
        file_path = source / relative
        if git_path in tracked:
            if git_blob_sha(file_path.read_bytes()) != tracked[git_path]:
                fail('TRACKED_SOURCE_MISMATCH')
            count += 1
            continue
        if not relative.startswith('lib/') or not relative.endswith(GENERATED_SUFFIXES):
            fail('UNREVIEWED_SOURCE_FILE')
        generated[relative] = source_files[relative]
    # Frozen workspace dependency input must be bound to the same Git HEAD,
    # regardless of whether the CLI puts the root lockfile inside the ZIP.
    lock = tracked_blob_map(root, expected_sha, 'pnpm-lock.yaml').get('pnpm-lock.yaml')
    lock_path = root / 'pnpm-lock.yaml'
    if not lock or not lock_path.is_file() or git_blob_sha(lock_path.read_bytes()) != lock:
        fail('DEPENDENCY_LOCK_UNVERIFIED')
    return generated, count, digest(lock_path.read_bytes())


def rebuild_generated_from_reviewed_source(root, expected_sha):
    # No operator-supplied manifest or build script is accepted. Always replay
    # the exact reviewed checkout in a separate temporary Git worktree, using
    # frozen, OFFLINE dependency installation and the repository's build task.
    try:
        node = subprocess.check_output(['node', '--version'], timeout=10, text=True).strip()
        pnpm = subprocess.check_output(['pnpm', '--version'], timeout=10, text=True).strip()
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        fail('GENERATED_REBUILD_UNAVAILABLE')
    if not node.startswith('v22.') or pnpm != PINNED_PNPM:
        fail('BUILD_TOOLCHAIN_MISMATCH')
    with tempfile.TemporaryDirectory(prefix='urai-reviewed-functions-') as temporary:
        checkout = Path(temporary) / 'reviewed'
        try:
            subprocess.run(
                ['git', '-C', str(root), 'worktree', 'add', '--detach', '--quiet', str(checkout), expected_sha],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=45,
            )
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            fail('GENERATED_REBUILD_UNAVAILABLE')
        try:
            env = {**os.environ, 'CI': 'true', 'COREPACK_ENABLE_NETWORK': '0', 'npm_config_offline': 'true'}
            for command in (
                ['pnpm', 'install', '--offline', '--frozen-lockfile', '--ignore-scripts'],
                ['pnpm', '--filter', 'urai-functions', 'build'],
            ):
                try:
                    subprocess.run(command, cwd=checkout, env=env, check=True,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
                except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
                    fail('GENERATED_REBUILD_UNAVAILABLE')
            generated_root = checkout / 'apps/functions/lib'
            if not generated_root.is_dir():
                fail('GENERATED_REBUILD_INCOMPLETE')
            rebuilt = inspected_files(generated_root)
            if not rebuilt or any(not n.endswith(GENERATED_SUFFIXES) for n in rebuilt):
                fail('GENERATED_REBUILD_INCOMPLETE')
            return {'lib/' + n: metadata for n, metadata in rebuilt.items()}
        finally:
            # Remove only the independently created temporary worktree.
            subprocess.run(['git', '-C', str(root), 'worktree', 'remove', '--force', str(checkout)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30, check=False)


def inspect_archive(repo_root, source_dir, archive_path, expected_sha, *, rebuild_generated=False):
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
    generated, reviewed_count, lock_digest = source_authority(root, source, source_files, expected_sha)
    if generated:
        if not rebuild_generated:
            fail('GENERATED_REBUILD_REQUIRED')
        independently_generated = rebuild_generated_from_reviewed_source(root, expected_sha)
        if independently_generated != generated:
            fail('GENERATED_OUTPUT_MISMATCH')
    archived = {}
    total = 0
    archive_format = 'zip' if archive.suffix == '.zip' else 'tar.gz' if archive.name.endswith('.tar.gz') else None
    if archive_format is None:
        fail('UNSUPPORTED_ARCHIVE_FORMAT')
    try:
        if archive_format == 'zip':
            with zipfile.ZipFile(archive) as z:
                entries = z.infolist()
                if len(entries) > MAX_FILES * 2:
                    fail('TOO_MANY_ENTRIES')
                seen = set()
                for entry in entries:
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
        else:
            with tarfile.open(archive, 'r:gz') as t:
                members = t.getmembers()
                if len(members) > MAX_FILES * 2:
                    fail('TOO_MANY_ENTRIES')
                seen = set()
                for member in members:
                    name = valid_name(member.name + '/' if member.isdir() and not member.name.endswith('/') else member.name, member.isdir())
                    if name in seen:
                        fail('DUPLICATE_ENTRY')
                    seen.add(name)
                    if not (member.isdir() or member.isfile()):
                        fail('ARCHIVE_NONREGULAR')
                    if member.isdir():
                        continue
                    if name == '.runtimeconfig.json':
                        fail('UNBOUND_RUNTIME_CONFIG')
                    if member.size > MAX_FILE_BYTES:
                        fail('ENTRY_INVALID')
                    total += member.size
                    if total > MAX_UNCOMPRESSED_BYTES:
                        fail('UNCOMPRESSED_TOO_LARGE')
                    stream = t.extractfile(member)
                    if stream is None:
                        fail('ARCHIVE_CORRUPT')
                    with stream:
                        payload = stream.read(MAX_FILE_BYTES + 1)
                    if len(payload) != member.size:
                        fail('ARCHIVE_CORRUPT')
                    archived[name] = (member.size, digest(payload))
    except SourceArchiveError:
        raise
    except (zipfile.BadZipFile, tarfile.TarError, EOFError, RuntimeError, OSError, ValueError):
        fail('ARCHIVE_CORRUPT')
    if set(source_files) != set(archived):
        fail('FILE_SET_MISMATCH')
    if any(archived[name] != identity for name, identity in source_files.items()):
        fail('FILE_DIGEST_MISMATCH')
    content_lines = ''.join(f'{name}\t{size}\t{hexdigest}\n' for name, (size, hexdigest) in sorted(archived.items()))
    return {
        'schema': 'urai-local-functions-archive-content-v2',
        'status': 'OFFLINE_PACKAGE_BYTES_MATCH_ONLY',
        'repository': 'LifeLoggerAI/urai-spatial',
        'checkoutSha': expected_sha,
        'trackedFunctionsTree': git(root, 'rev-parse', 'HEAD:apps/functions'),
        'reviewedInputFileCount': reviewed_count,
        'independentlyRebuiltFileCount': len(generated),
        'generatedOutputBuildVerified': not generated or rebuild_generated,
        'dependencyLockSha256': lock_digest,
        'toolchainVerifiedByOfflineRebuild': bool(generated and rebuild_generated),
        'archiveSha256': digest(archive.read_bytes()),
        'archiveFormat': archive_format,
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
    parser.add_argument('--rebuild-generated', action='store_true',
                        help='Independently rebuild ignored lib output from exact HEAD with frozen offline pnpm')
    args = parser.parse_args()
    try:
        evidence = inspect_archive(args.repo_root, args.source_dir, args.archive, args.expected_sha,
                                   rebuild_generated=args.rebuild_generated)
        print(json.dumps(evidence, sort_keys=True))
    except (SourceArchiveError, OSError) as exc:
        parser.exit(2, f'{exc}\n')


if __name__ == '__main__':
    main()
