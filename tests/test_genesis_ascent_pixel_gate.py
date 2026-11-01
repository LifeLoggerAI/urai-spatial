"""Synthetic fixture tests for HOLD-only physical Ascent visual checking.

These videos are deliberately fabricated test patterns, NOT UrAi footage.
They must never be distributed or labelled as native app capture.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import random
import subprocess
import tempfile
import unittest
from PIL import Image, ImageDraw

MODULE = Path(__file__).resolve().parents[1] / 'scripts/genesis-ascent-pixel-gate.py'
spec = importlib.util.spec_from_file_location('genesis_ascent_pixel_gate', MODULE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def telemetry(video_hash):
    return {
        'schema': m.SCHEMA,
        'applicationRevision': '07892c7d549f8eafe160184315c4db3f7bfcb624',
        'sourceVideoSha256': video_hash,
        'buildProvenance': 'DECLARED_SHA_NOT_INDEPENDENTLY_ATTESTED',
        'fixture': 'EXPLICIT_DISCLOSED_DEMO_QUIET_RESET_NO_PERSONAL_ACCOUNT',
        'samples': [
            {'ticks': 120 + i * 10, 'seconds': round(i * .36, 3),
             'progress': round(i / 10, 3), 'position': [0, 1.5 + 3.6 * i, -15 * i / 10]}
            for i in range(11)
        ],
    }


def footage(root: Path, kind: str) -> Path:
    frames = root / f'{kind}-frames'
    frames.mkdir()
    # A deterministic textured scene with scrolling terrain vs a stationary star sky.
    rng = random.Random(2109)
    world = Image.new('RGB', (640, 960), (35, 61, 80))
    dw = ImageDraw.Draw(world)
    for i in range(620):
        x = rng.randrange(0, 640)
        y = rng.randrange(0, 960)
        dx = rng.randrange(4, 36)
        dy = rng.randrange(3, 31)
        color = (rng.randrange(40, 245), rng.randrange(40, 245), rng.randrange(45, 230))
        dw.rectangle((x, y, x + dx, y + dy), fill=color)
    for i in range(48):
        offset = (i * 7) if kind != 'static' else 0
        pic = world.crop((0, offset, 640, offset + 360))
        if kind == 'static':
            d = ImageDraw.Draw(pic)
            # A few changing stars do not constitute travelling through scenery.
            d.point((200 + (i % 3), 40), fill=(255, 255, 255))
        if kind == 'blackcut' and 17 <= i <= 26:
            pic = Image.new('RGB', (640, 360), (0, 0, 0))
        pic.save(frames / f'{i:03d}.png')
    target = root / f'fixture_{kind}_NOT_URAI.mp4'
    r = subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-framerate','8',
                        '-i',str(frames/'%03d.png'),'-c:v','libx264',
                        '-preset','ultrafast','-pix_fmt','yuv420p',str(target)],
                       capture_output=True,timeout=90)
    assert r.returncode == 0, r.stderr.decode(errors='replace')
    return target


class OfflineAscentVisualGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='urai-ascent-test-only-')
        cls.root = Path(cls.temp.name)
        cls.video = {mode: footage(cls.root, mode) for mode in ('moving','static','blackcut')}

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def pixels(self, kind):
        file = self.video[kind]
        metadata = m.probe(file)
        return m.inspect_pixels(m.decoded_frames(file, metadata['durationSeconds']), metadata['durationSeconds'])

    def test_rejects_stationary_scene_even_with_flickering_stars(self):
        with self.assertRaisesRegex(m.HoldRefusal, 'STATIONARY_OR_FROZEN_ASCENT_PIXELS'):
            self.pixels('static')

    def test_rejects_abrupt_dark_cut_over_moving_scene(self):
        with self.assertRaisesRegex(m.HoldRefusal, 'DARK_CUT_OR_BLANK_SKY_DETECTED'):
            self.pixels('blackcut')

    def test_purely_synthetic_moving_terrain_fixture_meets_pixel_heuristics_only(self):
        mdata = self.pixels('moving')
        self.assertGreater(mdata['movingPairs'], 8)
        self.assertGreater(mdata['coherentGeometryPairs'], 3)
        # A pass here NEVER proves that the video depicts UrAi or real ascent.

    def test_sha_bound_camera_telemetry_requires_actual_callback_motion(self):
        digest = m.sha256_file(self.video['moving'])
        result = m.validate_camera_telemetry(telemetry(digest), digest)
        self.assertGreater(result['cameraAltitudeDelta'], 30)
        frozen = telemetry(digest)
        frozen['samples'][6]['ticks'] = frozen['samples'][5]['ticks']
        with self.assertRaisesRegex(m.HoldRefusal, 'FROZEN_ASCENT_CAMERA_CALLBACKS'):
            m.validate_camera_telemetry(frozen, digest)

    def test_wrong_video_hash_fails_closed(self):
        record = telemetry('a' * 64)
        with self.assertRaisesRegex(m.HoldRefusal, 'CAMERA_TO_VIDEO_SOURCE_IDENTITY_MISMATCH'):
            m.validate_camera_telemetry(record, m.sha256_file(self.video['moving']))

    def test_old_immutable_build_cannot_claim_new_camera_telemetry(self):
        digest = m.sha256_file(self.video['moving'])
        record = telemetry(digest)
        record['applicationRevision'] = '94c8a2cf68a436a0c49e80b3a09578935df12d48'
        with self.assertRaisesRegex(m.HoldRefusal, 'ORIGINAL_STATIC_EXPORT_HAS_NO_CAMERA_TICK_TELEMETRY'):
            m.validate_camera_telemetry(record, digest)

    def test_teleporting_camera_and_out_of_video_timelines_rejected(self):
        digest = m.sha256_file(self.video['moving'])
        record = telemetry(digest)
        for i in range(10):
            record['samples'][i]['position'][1] = 1.5
        with self.assertRaisesRegex(m.HoldRefusal, 'CONTINUOUS_UPWARD_CAMERA_PATH_NOT_PROVEN'):
            m.validate_camera_telemetry(record, digest)
        record = telemetry(digest)
        with self.assertRaisesRegex(m.HoldRefusal, 'CAMERA_TELEMETRY_OUTSIDE_RECORDED_VIDEO'):
            m.validate_camera_telemetry(record, digest, 2.5)

    def test_missing_camera_telemetry_must_not_certify_pixels_as_native_ascent(self):
        # The CLI always keeps independent visual acceptance false, even with
        # strong moving pixels, until SHA-bound source telemetry is available.
        r = subprocess.run(['python3',str(MODULE),'--video',str(self.video['moving'])],capture_output=True,text=True,timeout=30)
        self.assertEqual(r.returncode,2)
        obj=json.loads(r.stdout)
        self.assertEqual(obj['status'],'HOLD_FAIL')
        self.assertIn('CAMERA_TELEMETRY_REQUIRED',obj['reason'])
        self.assertFalse(obj['visuallyApproved'])
        self.assertFalse(obj['publicPublishing'])

    def test_real_media_required_no_video_is_not_an_acceptance(self):
        r=subprocess.run(['python3',str(MODULE),'--video',str(self.root/'missing.webm')],capture_output=True,text=True,timeout=30)
        self.assertEqual(r.returncode,2)
        self.assertIn('GENUINE_ASCENT_SOURCE_VIDEO_MISSING',r.stdout)

    def test_parser_rejects_nonfinite_camera_fields_and_nonmonotonic_progress(self):
        digest=m.sha256_file(self.video['moving'])
        rec=telemetry(digest)
        rec['samples'][7]['progress']=float('nan')
        with self.assertRaisesRegex(m.HoldRefusal,'NONFINITE_ASCENT_TIMING'):
            m.validate_camera_telemetry(rec,digest)
        rec=telemetry(digest)
        rec['samples'][7]['progress']=0.05
        with self.assertRaisesRegex(m.HoldRefusal,'NONMONOTONIC_CAMERA_TIMING_OR_PROGRESS'):
            m.validate_camera_telemetry(rec,digest)


if __name__=='__main__':
    unittest.main()
