#!/usr/bin/env python3
"""No-network fictional archive integrity tests; no release admission."""
import os
import stat
import subprocess
import sys
import tempfile
import tarfile
import io
import unittest
import warnings
import zipfile
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_functions_source_archive import inspect_archive, SourceArchiveError


def run(root, *args):
    subprocess.run(['git', '-C', str(root), *args], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'repo'
        self.source = self.root / 'apps/functions'
        (self.source / 'src').mkdir(parents=True)
        (self.source / 'lib/apps/functions/src').mkdir(parents=True)
        (self.root / 'firebase.json').write_text('{"functions":{"source":"apps/functions"}}')
        (self.root / 'pnpm-lock.yaml').write_text('lockfileVersion: 9.0\n')
        (self.source / 'package.json').write_text('{"name":"fictional-functions"}')
        (self.source / 'src/index.ts').write_text('export const fixture = true\n')
        (self.source / 'lib/apps/functions/src/index.js').write_text('exports.fixture = true\n')
        run(self.root, 'init')
        run(self.root, 'remote', 'add', 'origin', 'https://github.com/LifeLoggerAI/urai-spatial.git')
        run(self.root, 'config', 'user.name', 'Fictional Tester')
        run(self.root, 'config', 'user.email', 'fictional@example.invalid')
        run(self.root, 'add', '.')
        run(self.root, 'commit', '-m', 'fictional archive fixture')
        self.sha = subprocess.check_output(['git', '-C', str(self.root), 'rev-parse', 'HEAD']).decode().strip()
        self.zip = Path(self.tmp.name) / 'source.zip'
        self.writezip()

    def writezip(self, tamper=None, omit=None, extra=None, link=False, duplicate=False):
        with zipfile.ZipFile(self.zip, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            for p in sorted(self.source.rglob('*')):
                if not p.is_file():
                    continue
                n = p.relative_to(self.source).as_posix()
                if omit == n:
                    continue
                z.writestr(n, b'tampered bytes' if tamper == n else p.read_bytes())
            if extra:
                z.writestr(extra, b'untrusted')
            if link:
                item = zipfile.ZipInfo('link-to-outside')
                item.create_system = 3
                item.external_attr = (stat.S_IFLNK | 0o777) << 16
                z.writestr(item, b'../../outside')
            if duplicate:
                with warnings.catch_warnings():
                    warnings.simplefilter('ignore', UserWarning)
                    z.writestr('src/index.ts', b'duplicate')

    def inspect(self):
        return inspect_archive(self.root, self.source, self.zip, self.sha)

    def reject(self, code):
        with self.assertRaisesRegex(SourceArchiveError, 'FUNCTIONS_ARCHIVE_' + code):
            self.inspect()

    def test_exact_regular_archive_is_only_a_local_receipt(self):
        r = self.inspect()
        self.assertEqual(r['checkoutSha'], self.sha)
        self.assertEqual(r['status'], 'OFFLINE_PACKAGE_BYTES_MATCH_ONLY')
        self.assertEqual(r['verifiedFileCount'], 3)
        self.assertFalse(r['trustedUploadVerified'])
        self.assertFalse(r['cloudBuildVerified'])
        self.assertFalse(r['stagingAdmission'])
        self.assertEqual(r['schema'], 'urai-local-functions-archive-content-v2')
        self.assertEqual(r['reviewedInputFileCount'], 3)
        self.assertEqual(r['independentlyRebuiltFileCount'], 0)
        self.assertTrue(r['dependencyLockSha256'])

    def test_wrong_source_bytes_rejected(self):
        self.writezip(tamper='src/index.ts')
        self.reject('FILE_DIGEST_MISMATCH')

    def test_missing_compiled_function_rejected(self):
        self.writezip(omit='lib/apps/functions/src/index.js')
        self.reject('FILE_SET_MISMATCH')

    def test_extra_archive_file_rejected(self):
        self.writezip(extra='src/backdoor.js')
        self.reject('FILE_SET_MISMATCH')

    def test_traversal_rejected(self):
        self.writezip(extra='../escape.txt')
        self.reject('ENTRY_PATH_UNSAFE')

    def test_duplicate_archive_entry_rejected(self):
        self.writezip(duplicate=True)
        self.reject('DUPLICATE_ENTRY')

    def test_archive_symlink_rejected(self):
        self.writezip(link=True)
        self.reject('ARCHIVE_NONREGULAR')

    def test_dirty_tracked_checkout_rejected(self):
        (self.source / 'src/index.ts').write_text('altered after commit\n')
        self.reject('DIRTY_CHECKOUT')

    def test_wrong_reviewed_commit_rejected(self):
        self.sha = 'f' * 40
        self.reject('EXACT_SHA_MISMATCH')

    def test_mismatched_functions_source_config_rejected(self):
        (self.root / 'firebase.json').write_text('{"functions":{"source":"other-functions"}}')
        run(self.root, 'add', '.')
        run(self.root, 'commit', '-m', 'fictional config change')
        self.sha = subprocess.check_output(['git', '-C', str(self.root), 'rev-parse', 'HEAD']).decode().strip()
        self.reject('CONFIG_SOURCE_MISMATCH')

    def test_wrong_repository_remote_rejected(self):
        run(self.root, 'remote', 'set-url', 'origin', 'https://github.com/untrusted/other.git')
        self.reject('REPOSITORY_MISMATCH')

    def test_unbound_runtime_config_rejected(self):
        self.writezip(extra='.runtimeconfig.json')
        self.reject('UNBOUND_RUNTIME_CONFIG')


    def test_untracked_typescript_injection_even_when_zip_matches_rejected(self):
        (self.source / 'src/unreviewed.ts').write_text('export const leak = true')
        self.writezip()
        self.reject('UNREVIEWED_SOURCE_FILE')

    def test_untracked_javascript_injection_even_when_zip_matches_rejected(self):
        (self.source / 'src/unreviewed.js').write_text('exports.backdoor = true')
        self.writezip()
        self.reject('UNREVIEWED_SOURCE_FILE')

    def test_untracked_runtime_entrypoint_rejected(self):
        (self.source / 'entrypoint.js').write_text('throw Error("hidden")')
        self.writezip()
        self.reject('UNREVIEWED_SOURCE_FILE')

    def test_untracked_package_configuration_rejected(self):
        (self.source / '.npmrc').write_text('registries=alternate')
        self.writezip()
        self.reject('UNREVIEWED_SOURCE_FILE')

    def test_gitignored_source_injection_rejected(self):
        (self.root / '.gitignore').write_text('apps/functions/src/hidden.js\n')
        run(self.root, 'add', '.gitignore')
        run(self.root, 'commit', '-m', 'fixture ignored source')
        self.sha = subprocess.check_output(['git', '-C', str(self.root), 'rev-parse', 'HEAD']).decode().strip()
        (self.source / 'src/hidden.js').write_text('exports.injection = true')
        self.writezip()
        self.reject('UNREVIEWED_SOURCE_FILE')

    def make_generated_untracked(self):
        (self.root / '.gitignore').write_text('apps/functions/lib/\n')
        run(self.root, 'rm', '--cached', 'apps/functions/lib/apps/functions/src/index.js')
        run(self.root, 'add', '.gitignore')
        run(self.root, 'commit', '-m', 'fixture generated lib ignored')
        self.sha = subprocess.check_output(['git', '-C', str(self.root), 'rev-parse', 'HEAD']).decode().strip()

    def test_gitignored_compiled_file_requires_replay(self):
        self.make_generated_untracked()
        (self.source / 'lib/apps/functions/src/index.js').write_text('exports.attacker = true\n')
        self.writezip()
        self.reject('GENERATED_REBUILD_REQUIRED')

    def test_matching_generated_lib_accepted_only_with_independent_replay(self):
        self.make_generated_untracked()
        self.writezip()
        from verify_functions_source_archive import inspected_files
        derived = {'lib/' + k: v for k, v in inspected_files(self.source / 'lib').items()}
        with patch('verify_functions_source_archive.rebuild_generated_from_reviewed_source', return_value=derived) as rebuild:
            r = inspect_archive(self.root, self.source, self.zip, self.sha, rebuild_generated=True)
        rebuild.assert_called_once()
        self.assertEqual(r['independentlyRebuiltFileCount'], 1)
        self.assertTrue(r['generatedOutputBuildVerified'])
        self.assertFalse(r['trustedUploadVerified'])

    def test_compiled_file_different_from_replayed_build_rejected(self):
        self.make_generated_untracked()
        (self.source / 'lib/apps/functions/src/index.js').write_text('unreviewed generated bytes\n')
        self.writezip()
        from verify_functions_source_archive import inspected_files
        expected = {'lib/' + k: v for k, v in inspected_files(self.source / 'lib').items()}
        expected['lib/apps/functions/src/index.js'] = (7, 'f' * 64)
        with patch('verify_functions_source_archive.rebuild_generated_from_reviewed_source', return_value=expected):
            with self.assertRaisesRegex(SourceArchiveError, 'FUNCTIONS_ARCHIVE_GENERATED_OUTPUT_MISMATCH'):
                inspect_archive(self.root, self.source, self.zip, self.sha, rebuild_generated=True)

    def test_generated_executable_not_compiler_output_rejected(self):
        self.make_generated_untracked()
        (self.source / 'lib/installer.sh').write_text('echo attacker\n')
        self.writezip()
        self.reject('UNREVIEWED_SOURCE_FILE')

    def test_dependency_lockfile_mismatch_rejected(self):
        (self.root / 'pnpm-lock.yaml').write_text('malicious lockfile alteration\n')
        self.reject('DIRTY_CHECKOUT')

    def test_dependency_lockfile_missing_from_exact_tree_rejected(self):
        run(self.root, 'rm', 'pnpm-lock.yaml')
        run(self.root, 'commit', '-m', 'fixture lock removed')
        self.sha = subprocess.check_output(['git', '-C', str(self.root), 'rev-parse', 'HEAD']).decode().strip()
        self.reject('DEPENDENCY_LOCK_UNVERIFIED')

    def test_manifest_digest_does_not_infer_identical_zip_bytes(self):
        first = self.inspect()
        with zipfile.ZipFile(self.zip, 'w', compression=zipfile.ZIP_STORED) as z:
            for p in sorted(self.source.rglob('*')):
                if p.is_file():
                    z.writestr(p.relative_to(self.source).as_posix(), p.read_bytes())
        second = self.inspect()
        self.assertEqual(first['entryManifestSha256'], second['entryManifestSha256'])
        self.assertNotEqual(first['archiveSha256'], second['archiveSha256'])
        self.assertFalse(second['cloudBuildVerified'])

    def test_tar_gz_same_manifest_but_different_archive_bytes(self):
        original = self.inspect()
        target = self.zip.with_name('source.tar.gz')
        with tarfile.open(target, 'w:gz') as t:
            for p in sorted(self.source.rglob('*')):
                if not p.is_file():
                    continue
                data = p.read_bytes()
                member = tarfile.TarInfo(p.relative_to(self.source).as_posix())
                member.size = len(data)
                t.addfile(member, io.BytesIO(data))
        self.zip = target
        result = self.inspect()
        self.assertEqual(result['archiveFormat'], 'tar.gz')
        self.assertEqual(original['entryManifestSha256'], result['entryManifestSha256'])
        self.assertNotEqual(original['archiveSha256'], result['archiveSha256'])
        self.assertFalse(result['cloudStorageGenerationVerified'])

    def test_tar_gz_symlink_and_traversal_fail(self):
        self.zip = self.zip.with_name('source.tar.gz')
        for name, link in [('lib/alias.js', True), ('../outside.js', False)]:
            with tarfile.open(self.zip, 'w:gz') as t:
                for p in sorted(self.source.rglob('*')):
                    if p.is_file():
                        data = p.read_bytes()
                        item = tarfile.TarInfo(p.relative_to(self.source).as_posix())
                        item.size = len(data)
                        t.addfile(item, io.BytesIO(data))
                item = tarfile.TarInfo(name)
                item.type = tarfile.SYMTYPE if link else tarfile.REGTYPE
                item.linkname = '../../etc/passwd' if link else ''
                item.size = 0
                t.addfile(item, io.BytesIO(b''))
            self.reject('ARCHIVE_NONREGULAR' if link else 'ENTRY_PATH_UNSAFE')

    def test_archive_extension_must_be_supported(self):
        old = self.zip
        self.zip = self.zip.with_name('source.bin')
        self.zip.write_bytes(old.read_bytes())
        self.reject('UNSUPPORTED_ARCHIVE_FORMAT')

    def test_archive_corruption_rejected(self):
        b = bytearray(self.zip.read_bytes())
        b[0:4] = b'FAIL'
        self.zip.write_bytes(b)
        self.reject('ARCHIVE_CORRUPT')


if __name__ == '__main__':
    unittest.main()
