import hashlib
import json
import os
import stat
import tempfile
import unittest
import warnings
import zipfile
from pathlib import Path
from compare_firebase_zip_identity import ComparisonError, compare_packages, inspect_archive

SHA = 'a' * 40
TREE = 'b' * 40

def record(path, native_hash='c' * 40):
    return {'sourceSha':SHA,'functionsTreeSha':TREE,'nativeSourceHash':native_hash,
            'firebaseCliVersion':'15.22.3','archiveSha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),
            'archiveSize':Path(path).stat().st_size}

class CompareTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.a = Path(self.temp.name) / 'first.zip'
        self.b = Path(self.temp.name) / 'second.zip'
        self.mkzip(self.a)
        self.mkzip(self.b)

    def mkzip(self,path, *, files=None, when=(2026,10,16,10,12,2), mode=0o644, reverse=False,
              compressor=zipfile.ZIP_DEFLATED, duplicate=False, symlink=False):
        files = files if files is not None else {'package.json':b'{"name":"fictional"}', 'lib/index.js':b'exports.a=1;'}
        with zipfile.ZipFile(path,'w') as z:
            for name,content in (reversed(list(files.items())) if reverse else files.items()):
                info=zipfile.ZipInfo(name, date_time=when)
                info.create_system=3
                info.external_attr = (stat.S_IFREG | mode) << 16
                info.compress_type=compressor
                z.writestr(info,content)
            if duplicate:
                with warnings.catch_warnings():
                    warnings.simplefilter('ignore',UserWarning)
                    z.writestr('package.json',b'duplicate')
            if symlink:
                info=zipfile.ZipInfo('linked')
                info.create_system=3
                info.external_attr=(stat.S_IFLNK|0o777)<<16
                z.writestr(info,b'../../oops')

    def compare(self):
        return compare_packages(self.a,self.b,record(self.a),record(self.b),SHA)
    def reject(self, code, a=None,b=None):
        with self.assertRaisesRegex(ComparisonError, 'FIREBASE_ZIP_IDENTITY_'+code):
            compare_packages(self.a,self.b,a if a is not None else record(self.a),
                             b if b is not None else record(self.b),SHA)

    def test_identical_bytes_are_exactly_identical(self):
        result=self.compare()
        self.assertTrue(result['sameReviewedSourceContent'])
        self.assertTrue(result['sameExactArchiveBytes'])
        self.assertFalse(result['providerUploadVerified'])

    def test_changed_dos_timestamps_preserve_content_but_not_exact_bytes(self):
        self.mkzip(self.b,when=(2026,10,16,11,12,2))
        result=self.compare()
        self.assertTrue(result['sameReviewedSourceContent'])
        self.assertFalse(result['sameExactArchiveBytes'])
        self.assertIn('timestamp',result['changedMetadataExamples'][0]['fields'])

    def test_order_changed_not_byte_identical(self):
        self.mkzip(self.b,reverse=True)
        result=self.compare()
        self.assertTrue(result['sameReviewedSourceContent'])
        self.assertFalse(result['sameExactArchiveBytes'])
        self.assertFalse(result['sameEntryOrder'])

    def test_permissions_and_compression_change_byte_identity(self):
        self.mkzip(self.b,mode=0o755,compressor=zipfile.ZIP_STORED)
        result=self.compare()
        self.assertFalse(result['sameExactArchiveBytes'])
        self.assertTrue(result['sameReviewedSourceContent'])
        self.assertGreater(result['changedMetadataMemberCount'],0)

    def test_changed_payload_rejects_content_equivalence(self):
        self.mkzip(self.b,files={'package.json':b'{"name":"evil"}', 'lib/index.js':b'exports.a=1;'})
        self.reject('SOURCE_CONTENT_DIFFERENT')

    def test_added_executable_rejects_content_equivalence(self):
        self.mkzip(self.b,files={'package.json':b'{"name":"fictional"}', 'lib/index.js':b'exports.a=1;', 'evil.js':b'1'})
        self.reject('SOURCE_CONTENT_DIFFERENT')

    def test_invalid_local_sha_receipt_rejects(self):
        d=record(self.b); d['archiveSha256']='f'*64
        self.reject('BYTE_RECEIPT_MISMATCH',b=d)

    def test_mismatched_git_tree_rejects(self):
        d=record(self.b);d['functionsTreeSha']='f'*40
        self.reject('SOURCE_TREE_DIFFERENT',b=d)

    def test_mismatched_source_sha_rejects(self):
        d=record(self.a);d['sourceSha']='f'*40
        self.reject('SOURCE_OR_CLI_RECEIPT_INVALID',a=d)

    def test_untrusted_native_source_hash_rejects(self):
        d=record(self.a);d['nativeSourceHash']='f'*40
        self.reject('NATIVE_SOURCE_HASH_DIFFERENT',a=d)

    def test_corrupted_zip_rejects(self):
        self.b.write_bytes(b'not a real zip')
        self.reject('CORRUPT_ZIP')

    def test_duplicate_member_rejects(self):
        self.mkzip(self.b,duplicate=True)
        self.reject('DUPLICATE_ENTRY')

    def test_symlink_rejects(self):
        self.mkzip(self.b,symlink=True)
        self.reject('NONREGULAR_ENTRY')

    def test_traversal_rejects(self):
        self.mkzip(self.b,files={'../escape':b'danger'})
        self.reject('UNSAFE_MEMBER')

    def test_comparison_uses_raw_zip_digest_separately_from_manifest(self):
        self.mkzip(self.b,when=(2026,10,16,12,0,2))
        x=self.compare()
        self.assertNotEqual(x['archiveSha256First'],x['archiveSha256Second'])
        self.assertEqual(inspect_archive(self.a)['entryManifestSha256'],inspect_archive(self.b)['entryManifestSha256'])

if __name__=='__main__':unittest.main()
