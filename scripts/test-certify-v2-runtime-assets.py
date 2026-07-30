#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image

MODULE_PATH = Path(__file__).with_name('certify-v2-runtime-assets.py')
spec = importlib.util.spec_from_file_location('certify_v2_runtime_assets', MODULE_PATH)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class V2CertificationRegressionTests(unittest.TestCase):
    def test_fully_transparent_hidden_rgb_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'hidden-rgb.webp'
            Image.new('RGBA', (32, 32), (220, 80, 30, 0)).save(
                path, 'WEBP', lossless=True, exact=True
            )
            result, _ = module.inspect_image(
                path, {'ratio': 1.0, 'longEdge': 32, 'alpha': True}
            )
            self.assertEqual(result['alphaMax'], 0)
            self.assertEqual(result['visiblePixels'], 0)
            self.assertFalse(result['alphaValid'])
            self.assertTrue(result['nearEmpty'])
            self.assertEqual(result['technicalStatus'], 'noncompliant')

    def test_duplicate_registry_paths_fail_closed(self) -> None:
        counts = {
            'helperSpecs': 11,
            'objectSpecs': 9,
            'starSpecs': 19,
            'focusSpecs': 9,
            'replaySpecs': 9,
            'mirrorSpecs': 7,
            'passportSpecs': 8,
            'onboardingSpecs': 4,
            'accessibilitySpecs': 4,
        }
        blocks = []
        for variable, folder in module.GROUPS.items():
            rows = []
            for index in range(counts[variable]):
                slug = f'{variable.lower()}-{index}'
                if variable == 'helperSpecs' and index == 1:
                    slug = 'helperspecs-0'
                rows.append(f"  ['{slug}', 'alt', '/fallback'],")
            blocks.append(
                f"const {variable} = [\n" + '\n'.join(rows) +
                f"\n] as const\nconst bound_{variable} = makeGroup('{folder}', {variable})"
            )
        with self.assertRaisesRegex(ValueError, 'duplicate registry asset paths'):
            module.parse_registry('\n'.join(blocks))


if __name__ == '__main__':
    unittest.main()
