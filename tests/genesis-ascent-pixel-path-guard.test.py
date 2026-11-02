import unittest
import tempfile
from pathlib import Path
import importlib.util

source = Path(__file__).resolve().parents[1] / 'scripts' / 'genesis-ascent-pixel-gate.py'
spec = importlib.util.spec_from_file_location('genesis_ascent_pixel_gate', source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
private_evidence_path = module.private_evidence_path
HoldRefusal = module.HoldRefusal

class PrivateAscentPathTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='urai-pixel-path-')
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)

    def test_direct_video_symlink_rejected(self):
        video=self.root/'video.webm'; video.write_bytes(b'test')
        alias=self.root/'alias.webm'; alias.symlink_to(video)
        self.assertFalse(alias.resolve().is_symlink())
        with self.assertRaisesRegex(HoldRefusal,'SYMLINK_PATH_FORBIDDEN'):
            private_evidence_path(str(alias))

    def test_symlink_ancestor_rejected(self):
        sub=self.root/'dir'; sub.mkdir()
        alias=self.root/'alias'; alias.symlink_to(sub,target_is_directory=True)
        with self.assertRaisesRegex(HoldRefusal,'SYMLINK_PATH_FORBIDDEN'):
            private_evidence_path(str(alias/'capture.webm'))

    def test_git_checkout_evidence_rejected(self):
        checkout=self.root/'checkout'; checkout.mkdir()
        (checkout/'.git').write_text('gitdir: other')
        with self.assertRaisesRegex(HoldRefusal,'INSIDE_GIT_CHECKOUT'):
            private_evidence_path(str(checkout/'evidence'/'test.json'))

    def test_ordinary_private_path_accepted(self):
        video=self.root/'video.webm'; video.write_bytes(b'test')
        self.assertEqual(private_evidence_path(str(video)),video)
        self.assertEqual(private_evidence_path(str(self.root/'future.json')),self.root/'future.json')

    def test_missing_or_nonstring_path_refused(self):
        for bad in ('',None,123):
            with self.assertRaisesRegex(HoldRefusal,'PATH_REQUIRED'):
                private_evidence_path(bad)

if __name__=='__main__': unittest.main()
