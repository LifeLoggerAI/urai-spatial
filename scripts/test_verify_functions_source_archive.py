#!/usr/bin/env python3
"""No-network fictional archive integrity tests; no release admission."""
import os
import stat
import subprocess
import sys
import tempfile
import unittest
import warnings
import zipfile
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


if __name__ == '__main__':
    unittest.main()
