#!/usr/bin/env python3
"""Compare two real local Firebase source ZIPs without conflating content and bytes.

This is strictly offline evidence. A caller's JSON and matching ZIPs cannot prove
source review, cloud upload, Cloud Build, or deployed revision identity.
"""
import argparse
import hashlib
import json
import re
import stat
import struct
import zipfile
from pathlib import Path, PurePosixPath

MAX_ARCHIVE = 128 * 1024 * 1024
MAX_FILES = 5000
MAX_ENTRY = 64 * 1024 * 1024
MAX_TOTAL = 256 * 1024 * 1024

class ComparisonError(ValueError):
    pass


def deny(reason):
    raise ComparisonError('FIREBASE_ZIP_IDENTITY_' + reason)


def sha256(value):
    return hashlib.sha256(value).hexdigest()


def valid_member(name, is_dir):
    if not isinstance(name, str) or not name or len(name) > 512 or '\\' in name or '\x00' in name:
        deny('UNSAFE_MEMBER')
    parts = name.rstrip('/').split('/')
    if name.startswith('/') or any(not p or p in ('.', '..') or any(ord(c) < 32 for c in p) for p in parts):
        deny('UNSAFE_MEMBER')
    if str(PurePosixPath(name.rstrip('/'))) != name.rstrip('/') or name.endswith('/') != is_dir:
        deny('UNSAFE_MEMBER')


def inspect_archive(archive_path):
    path = Path(archive_path).resolve(strict=True)
    if not path.is_file() or path.suffix != '.zip' or not 0 < path.stat().st_size <= MAX_ARCHIVE:
        deny('ARCHIVE_INVALID')
    size = path.stat().st_size
    archived_sha = hashlib.sha256()
    with path.open('rb') as stream:
        while True:
            block = stream.read(1024 * 1024)
            if not block:
                break
            archived_sha.update(block)
    files = {}
    metadata = {}
    order = []
    total = 0
    try:
        with path.open('rb') as source, zipfile.ZipFile(path) as package:
            entries = package.infolist()
            if len(entries) > MAX_FILES * 2:
                deny('ENTRY_LIMIT')
            for entry in entries:
                name = entry.filename
                valid_member(name, entry.is_dir())
                if name in metadata:
                    deny('DUPLICATE_ENTRY')
                if entry.flag_bits & 1 or entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                    deny('UNSUPPORTED_ENTRY')
                mode = stat.S_IFMT(entry.external_attr >> 16)
                if mode not in (0, stat.S_IFDIR if entry.is_dir() else stat.S_IFREG):
                    deny('NONREGULAR_ENTRY')
                if entry.file_size > MAX_ENTRY:
                    deny('ENTRY_TOO_LARGE')
                total += entry.file_size
                if total > MAX_TOTAL:
                    deny('TOTAL_TOO_LARGE')
                source.seek(entry.header_offset)
                local = source.read(30)
                if len(local) != 30 or local[:4] != b'PK\x03\x04':
                    deny('CORRUPT_LOCAL_HEADER')
                name_len, extra_len = struct.unpack_from('<HH', local, 26)
                raw_header = source.read(name_len + extra_len)
                if len(raw_header) != name_len + extra_len:
                    deny('CORRUPT_LOCAL_HEADER')
                compressed = source.read(entry.compress_size)
                if len(compressed) != entry.compress_size:
                    deny('CORRUPT_COMPRESSED_BYTES')
                info = {
                    'timestamp': list(entry.date_time),
                    'compression': entry.compress_type,
                    'compressedSize': entry.compress_size,
                    'compressedSha256': sha256(compressed),
                    'crc32': entry.CRC,
                    'externalAttributes': entry.external_attr,
                    'flags': entry.flag_bits,
                    'extraSha256': sha256(entry.extra),
                    'commentSha256': sha256(entry.comment),
                    'localHeaderSha256': sha256(local + raw_header),
                }
                metadata[name] = info
                order.append(name)
                if entry.is_dir():
                    continue
                # zipfile validates decompressed CRC on read. Do not normalize bytes.
                with package.open(entry, 'r') as fp:
                    payload = fp.read(MAX_ENTRY + 1)
                if len(payload) != entry.file_size:
                    deny('CORRUPT_CONTENT')
                files[name] = (entry.file_size, sha256(payload))
    except ComparisonError:
        raise
    except (zipfile.BadZipFile, EOFError, OSError, RuntimeError, ValueError):
        deny('CORRUPT_ZIP')
    manifest = ''.join(f'{name}\t{length}\t{digest}\n' for name, (length, digest) in sorted(files.items()))
    return {
        'archiveSha256': archived_sha.hexdigest(),
        'archiveSize': size,
        'entryManifestSha256': sha256(manifest.encode()),
        'fileCount': len(files),
        'files': files,
        'order': order,
        'metadata': metadata,
    }


def compare_packages(first, second, first_receipt, second_receipt, exact_head):
    if not re.fullmatch('[a-f0-9]{40}', exact_head or ''):
        deny('SOURCE_SHA_INVALID')
    a, b = inspect_archive(first), inspect_archive(second)
    for archive, receipt in ((a, first_receipt), (b, second_receipt)):
        if not isinstance(receipt, dict) or receipt.get('sourceSha') != exact_head or receipt.get('firebaseCliVersion') != '15.22.3':
            deny('SOURCE_OR_CLI_RECEIPT_INVALID')
        if receipt.get('archiveSha256') != archive['archiveSha256'] or receipt.get('archiveSize') != archive['archiveSize']:
            deny('BYTE_RECEIPT_MISMATCH')
        if not re.fullmatch('[a-f0-9]{40}', receipt.get('functionsTreeSha') or ''):
            deny('TREE_RECEIPT_INVALID')
    if first_receipt['functionsTreeSha'] != second_receipt['functionsTreeSha']:
        deny('SOURCE_TREE_DIFFERENT')
    if first_receipt.get('nativeSourceHash') != second_receipt.get('nativeSourceHash'):
        deny('NATIVE_SOURCE_HASH_DIFFERENT')
    equal_files = a['files'] == b['files']
    identical_bytes = a['archiveSha256'] == b['archiveSha256']
    if not equal_files:
        deny('SOURCE_CONTENT_DIFFERENT')
    if identical_bytes and (a['order'] != b['order'] or a['metadata'] != b['metadata']):
        deny('INCONSISTENT_IDENTICAL_ARCHIVES')
    changes = []
    for name in sorted(set(a['metadata']) | set(b['metadata'])):
        m, n = a['metadata'].get(name), b['metadata'].get(name)
        fields = ['entryPresence'] if m is None or n is None else [k for k in m if m[k] != n[k]]
        if fields:
            changes.append({'member': name, 'fields': fields})
    return {
        'schema': 'urai-offline-native-firebase-zip-comparison-v1',
        'classification': 'SAME_REVIEWED_SOURCE_CONTENT' if equal_files else 'SOURCE_CONTENT_DIFFERENT',
        'checkoutSha': exact_head,
        'functionsTreeSha': first_receipt['functionsTreeSha'],
        'sameReviewedSourceContent': equal_files,
        'sameExactArchiveBytes': identical_bytes,
        'archiveSha256First': a['archiveSha256'],
        'archiveSha256Second': b['archiveSha256'],
        'contentManifestSha256': a['entryManifestSha256'],
        'fileCount': a['fileCount'],
        'sameEntryOrder': a['order'] == b['order'],
        'changedMetadataMemberCount': len(changes),
        'changedMetadataExamples': changes[:15],
        'providerUploadVerified': False,
        'cloudStorageGenerationVerified': False,
        'cloudBuildSourceVerified': False,
        'deployedRevisionVerified': False,
        'privateMediaAccepted': False,
        'releaseCertified': False,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for opt in ('first-archive', 'second-archive', 'first-receipt', 'second-receipt', 'expected-sha'):
        p.add_argument('--' + opt, required=True)
    args = p.parse_args()
    try:
        first = json.loads(Path(args.first_receipt).read_text())
        second = json.loads(Path(args.second_receipt).read_text())
        result = compare_packages(args.first_archive, args.second_archive, first, second, args.expected_sha)
        print(json.dumps(result, sort_keys=True))
    except (ComparisonError, OSError, ValueError, json.JSONDecodeError) as error:
        p.exit(2, f'{error}\n')


if __name__ == '__main__':
    main()
