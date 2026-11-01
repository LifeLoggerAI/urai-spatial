"""Safe source/crypto tests. No footage, accounts, browser, publishing or real customer data."""
import base64
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MODULE = Path(__file__).resolve().parents[1] / 'scripts/render-verified-canonical-native-hold.py'
spec = importlib.util.spec_from_file_location('urai_canonical_private_renderer', MODULE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


EVENTS = [
    ('home',300), ('home-first-person',4700), ('home-ascent',5200),
    ('life-map-overview',9000), ('memory-star',14100), ('focus',15000),
    ('replay',19000), ('replay-playback-began',19300),
    ('replay-playback-end',24200), ('return-focus',26800),
    ('return-life-map-selected',28700), ('return-life-map-overview',31000),
    ('return-home',35000), ('orb-clicked',35200), ('orb-end',38500),
]


def record():
    stamps = {name: ms / 1000 for name, ms in EVENTS}
    clips = []
    for name, (first, last) in m.EXPECTED_INTERVALS.items():
        clips.append({
            'name': name, 'sourceCheckpointStart':first, 'sourceCheckpointEnd':last,
            'sourceStartSeconds':stamps[first], 'sourceEndSeconds':stamps[last],
            'sourceDurationSeconds': stamps[last] - stamps[first],
            'sourceSha256': 'a'*64, 'sourceBytes': 12000, 'codec':'vp9',
            'durationSeconds': stamps[last] - stamps[first],
            'motion':{'sampledFrames':8,'uniqueFrames':7},
            'encryption':{'sealedFile':name+'.sealed','sealedSha256':'b'*64,'sealedBytes':12300},
        })
    return {
        'schema':m.SOURCE_RECEIPT_SCHEMA,
        'source':{'repository':'LifeLoggerAI/urai-spatial','commit':m.ORIGINAL_SOURCE_SHA,'artifactId':12145312224},
        'fixture':'EXPLICIT_DISCLOSED_DEMO_QUIET_RESET_NO_PERSONAL_ACCOUNT',
        'release':'NO-GO/HOLD','publicPublishing':'HOLD','privateMedia':'DISABLED','nativeDispatch':'DISABLED',
        'evidence':{
            'continuousJourney':True,'realAscent':True,'exactCompiledSourceVerified':True,
            'ascentRasterMotion':{'verified':True,'sampleMethod':'decoded_original_webm_center_crop_grayscale_4fps',
                                  'frames':20,'interiorPairs':11,'strongPairs':10,
                                  'firstHalfStrongPairs':5,'secondHalfStrongPairs':5},
            'continuousRawVideo':{'videoSha256':'c'*64},
            'originalCanonicalProof':{'status':'passed','desktopPassed':True,'ascentProven':True,'identityStable':True},
        },
        'timeline':[{'id':n,'ms':t} for n,t in EVENTS],
        'clips':clips,'complete':True,'nativeClipsCaptured':7,'errors':[],
    }


class GenuineOnlyTests(unittest.TestCase):
    def test_seven_original_source_clips_and_editorial_cuts_sum_30(self):
        self.assertEqual(set(m.validate_receipt(record())),m.EXPECTED_NAMES)
        self.assertEqual(sum(item[2] for item in m.CUTS),30)
        self.assertEqual(len(m.CUTS),8)  # original 4-second title plus seven source scenes

    def test_incomplete_continuity_rejected(self):
        for field, value in [('continuousJourney',False),('realAscent',False),('exactCompiledSourceVerified',False)]:
            r=record();r['evidence'][field]=value
            with self.assertRaises(m.HoldRefusal):m.validate_receipt(r)

    def test_failed_original_source_proof_rejected(self):
        r=record();r['evidence']['originalCanonicalProof']['desktopPassed']=False
        with self.assertRaisesRegex(m.HoldRefusal,'ORIGINAL_CANONICAL_PROOF_NOT_PASSED'):m.validate_receipt(r)

    def test_private_media_or_publishing_activated_rejected(self):
        for field,bad in [('privateMedia','ENABLED'),('publicPublishing','READY'),('nativeDispatch','ENABLED')]:
            r=record();r[field]=bad
            with self.assertRaisesRegex(m.HoldRefusal,'RELEASE_HOLD_CONTRACT_BROKEN'):m.validate_receipt(r)

    def test_source_mismatch_and_duplicate_clip_rejected(self):
        r=record();r['source']['commit']='748e50398d85effeaa4ed17aaf78d4076dddbb45'
        with self.assertRaisesRegex(m.HoldRefusal,'ORIGINAL_CAPTURE_SOURCE_MISMATCH'):m.validate_receipt(r)
        r=record();r['clips'][-1]['name']='home'
        with self.assertRaises(m.HoldRefusal):m.validate_receipt(r)

    def test_timeline_mismatch_and_static_scene_rejected(self):
        r=record();r['timeline'][6]['ms']=17000
        with self.assertRaises(m.HoldRefusal):m.validate_receipt(r)
        r=record();r['clips'][0]['motion']['uniqueFrames']=1
        with self.assertRaisesRegex(m.HoldRefusal,'GENUINE_FRAME_MOTION_NOT_PROVEN'):m.validate_receipt(r)

    def test_untrusted_sealed_filename_rejected(self):
        r=record();r['clips'][0]['encryption']['sealedFile']='../../outside.sealed'
        with self.assertRaisesRegex(m.HoldRefusal,'CLIP_ENCRYPTION_RECEIPT_INVALID'):m.validate_receipt(r)

    def test_real_crypto_roundtrip_with_test_only_nonmedia_bytes(self):
        private_key = rsa.generate_private_key(public_exponent=65537,key_size=2048)
        public_key = private_key.public_key()
        payload=b'UrAi test-only nonmedia content. Do not present as recorded footage.'*10
        key=os.urandom(32);nonce=os.urandom(12)
        ciphertext= AESGCM(key).encrypt(nonce,payload,None)
        wrapped=public_key.encrypt(key,padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
        header={'format':m.SEAL_FORMAT,'encryptedKey':base64.b64encode(wrapped).decode(),
                'nonce':base64.b64encode(nonce).decode(),'tag':base64.b64encode(ciphertext[-16:]).decode(),
                'originalSha256':m.sha256(payload),'originalBytes':len(payload)}
        sealed=json.dumps(header).encode()+b'\n'+ciphertext[:-16]
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/'home.sealed';p.write_bytes(sealed)
            clip={'sourceSha256':m.sha256(payload),'sourceBytes':len(payload),
                  'encryption':{'sealedFile':p.name,'sealedSha256':m.sha256(sealed),'sealedBytes':len(sealed)}}
            cipher,metadata=m.verified_seal(clip,Path(t))
            self.assertEqual(m.decrypt_seal(cipher,metadata,private_key),payload)
            p.write_bytes(sealed+b'tampered')
            with self.assertRaisesRegex(m.HoldRefusal,'ENCRYPTED_CLIP_SHA256_MISMATCH'):
                m.verified_seal(clip,Path(t))

    def test_private_render_output_must_be_outside_public_source_checkout(self):
        with self.assertRaisesRegex(m.HoldRefusal, 'DECRYPTED_VIDEO_OUTPUT_CANNOT_BE_INSIDE_PUBLIC_REPOSITORY'):
            m.verify_private_output_destination(MODULE.parent.parent / 'private_native_product_holds')
        with tempfile.TemporaryDirectory() as t:
            m.verify_private_output_destination(Path(t))

    def test_private_render_output_rejects_other_git_checkouts(self):
        with tempfile.TemporaryDirectory() as td:
            other = Path(td) / 'unrelated-public-repository'
            (other / '.git').mkdir(parents=True)
            with self.assertRaisesRegex(m.HoldRefusal, 'DECRYPTED_VIDEO_OUTPUT_CANNOT_BE_INSIDE_GIT_CHECKOUT'):
                m.verify_private_output_destination(other / 'dist' / 'decrypted-video')
            outside = Path(td) / 'private-custody'
            m.verify_private_output_destination(outside)

    def test_missing_editorial_zip_does_not_pass(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/'not-the-original-review.zip';p.write_text('incorrect')
            with self.assertRaisesRegex(m.HoldRefusal,'ORIGINAL_EDITORIAL_ZIP_HASH_MISMATCH'):m.verify_editorial_zip(p)


    def test_timestamp_margin_declared_duration_and_encoded_edit_requirement(self):
        valid = record()
        self.assertEqual(set(m.validate_receipt(valid)), m.EXPECTED_NAMES)
        short = record()
        short['timeline'][1]['ms'] = 4200
        home = next(x for x in short['clips'] if x['name'] == 'home')
        home['sourceEndSeconds'] = 4.2
        home['sourceDurationSeconds'] = 3.9
        home['durationSeconds'] = 3.9
        with self.assertRaisesRegex(m.HoldRefusal, 'INSUFFICIENT_SOURCE_JOURNEY_FOR_EDIT:home'):
            m.validate_receipt(short)
        mismatch = record()
        mismatch['clips'][0]['sourceDurationSeconds'] += 1.0
        with self.assertRaisesRegex(m.HoldRefusal, 'DECLARED_CLIP_DURATION_MISMATCH'):
            m.validate_receipt(mismatch)
        encoded = record()
        encoded['clips'][0]['durationSeconds'] = 3.6
        with self.assertRaisesRegex(m.HoldRefusal, 'ENCODED_CLIP_TOO_SHORT_OR_MISMATCHED'):
            m.validate_receipt(encoded)
        invalid = record()
        invalid['timeline'][2]['ms'] = float('nan')
        with self.assertRaisesRegex(m.HoldRefusal, 'NONMONOTONIC_OR_DUPLICATE_JOURNEY_EVENT'):
            m.validate_receipt(invalid)
        invalid = record()
        invalid['clips'][0]['sourceStartSeconds'] = float('inf')
        with self.assertRaisesRegex(m.HoldRefusal, 'MALFORMED_SOURCE_CLIP_TIMESTAMPS'):
            m.validate_receipt(invalid)

    def test_bounded_encrypted_clip_checked_before_loading_bytes(self):
        valid = record()
        too_big = record()
        too_big['clips'][0]['sourceBytes'] = m.MAX_NATIVE_SOURCE_BYTES + 1
        with self.assertRaisesRegex(m.HoldRefusal, 'CLIP_SOURCE_BYTES_NOT_VERIFIED'):
            m.validate_receipt(too_big)
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / 'home.sealed'
            with target.open('wb') as f:
                f.truncate(m.MAX_ENCRYPTED_CLIP_BYTES + 1)  # sparse, no large allocation
            clip = valid['clips'][0]
            with self.assertRaisesRegex(m.HoldRefusal, 'ENCRYPTED_CLIP_EXCEEDS_SIZE_LIMIT'):
                m.verified_seal(clip, Path(td))
            forged = dict(clip)
            forged['encryption'] = dict(clip['encryption'], sealedBytes=m.MAX_ENCRYPTED_CLIP_BYTES + 1)
            with self.assertRaisesRegex(m.HoldRefusal, 'ENCRYPTED_CLIP_EXCEEDS_SIZE_LIMIT'):
                m.verified_seal(forged, Path(td))


    def test_private_package_manifest_contains_exact_source_and_no_key_material(self):
        with tempfile.TemporaryDirectory() as td:
            folder = Path(td)
            receipt = folder / 'continuous-motion-receipt.json'
            provenance = record()
            receipt.write_text(json.dumps(provenance), encoding='utf8')
            source, instructions = m.private_reproducibility_receipts(folder, provenance, receipt)
            data = json.loads(source.read_text(encoding='utf8'))
            self.assertEqual(data['originalCompiledApplication']['commit'], m.ORIGINAL_SOURCE_SHA)
            self.assertEqual(data['originalCompiledApplication']['archiveSha256'], m.ORIGINAL_ARCHIVE_SHA256)
            self.assertEqual(data['captureSourceReceiptSha256'], m.file_sha256(receipt))
            self.assertEqual(data['renderImplementationSha256'], m.file_sha256(MODULE))
            self.assertEqual(len(data['sevenNativeClips']), 7)
            self.assertEqual(data['status'], 'PRIVATE_HOLD')
            self.assertFalse(data['publicRelease'])
            text = instructions.read_text(encoding='utf8')
            self.assertIn('--check-only', text)
            self.assertIn('OWNER_CONTROLLED_PRIVATE_KEY_PATH', text)
            self.assertNotIn('-----BEGIN PRIVATE KEY-----', text)
            self.assertNotIn('ghp_', text)

    def test_private_package_manifest_refuses_missing_real_capture_receipt(self):
        with tempfile.TemporaryDirectory() as td:
            folder = Path(td)
            receipt = folder / 'capture-receipt.json'
            receipt.write_text('test only')
            missing = record()
            missing['complete'] = False
            with self.assertRaisesRegex(m.HoldRefusal, 'NATIVE_CAPTURE_INCOMPLETE_FOR_PACKAGE_MANIFEST'):
                m.private_reproducibility_receipts(folder, missing, receipt)
            self.assertFalse((folder / 'GENESIS_NATIVE_SOURCE_MANIFEST_HOLD.json').exists())


    def test_review_media_acceptance_requires_720_h264_aac_frames(self):
        def probe():
            return {'streams': [
                {'codec_type':'video', 'codec_name':'h264', 'width':540, 'height':960,
                 'avg_frame_rate':'24/1', 'nb_read_frames':'720'},
                {'codec_type':'audio', 'codec_name':'aac'}],
                'format': {'duration':'30.018'}}
        self.assertEqual(m.inspect_review_metadata(probe())['frameCount'], 720)
        malformed = probe(); malformed['streams'][0]['nb_read_frames'] = '719'
        with self.assertRaisesRegex(m.HoldRefusal, 'REVIEW_COPY_CODEC_RESOLUTION_FPS_OR_FRAMECOUNT_FAILED'):
            m.inspect_review_metadata(malformed)
        malformed = probe(); malformed['streams'][0]['codec_name'] = 'vp9'
        with self.assertRaisesRegex(m.HoldRefusal, 'REVIEW_COPY_CODEC_RESOLUTION_FPS_OR_FRAMECOUNT_FAILED'):
            m.inspect_review_metadata(malformed)
        malformed = probe(); malformed['streams'][1]['codec_name'] = 'pcm_s16le'
        with self.assertRaisesRegex(m.HoldRefusal, 'REVIEW_COPY_AAC_AUDIO_MISSING'):
            m.inspect_review_metadata(malformed)
        malformed = probe(); malformed['format']['duration'] = '29.5'
        with self.assertRaisesRegex(m.HoldRefusal, 'REVIEW_COPY_30_SECOND_DURATION_FAILED'):
            m.inspect_review_metadata(malformed)
        malformed = probe(); malformed['format']['duration'] = 'nan'
        with self.assertRaisesRegex(m.HoldRefusal, 'REVIEW_COPY_30_SECOND_DURATION_FAILED'):
            m.inspect_review_metadata(malformed)

    def test_cover_requires_real_decodable_vertical_png(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'cover.png'
            Image.new('RGB',(1080,1920),(2,4,8)).save(p)
            m.validate_cover(p)
            Image.new('RGB',(720,1280),(2,4,8)).save(p)
            with self.assertRaisesRegex(m.HoldRefusal, 'NATIVE_COVER_FORMAT_OR_DIMENSIONS_FAILED'):
                m.validate_cover(p)
            p.write_bytes(b'bad png content')
            with self.assertRaisesRegex(m.HoldRefusal, 'NATIVE_COVER_DECODE_FAILED'):
                m.validate_cover(p)

    def test_review_full_decode_failure_cannot_pass(self):
        from unittest.mock import patch
        review = Path('/nonexistent/review.mp4')
        probe = {'streams': [
            {'codec_type':'video','codec_name':'h264','width':540,'height':960,
             'avg_frame_rate':'24/1','nb_read_frames':'720'},
            {'codec_type':'audio','codec_name':'aac'}],
            'format':{'duration':'30.01'}}
        class FailedProcess:
            returncode = 1
        with patch.object(m, 'ffprobe', return_value=probe), patch.object(m.subprocess, 'run', return_value=FailedProcess()):
            with self.assertRaisesRegex(m.HoldRefusal, 'REVIEW_COPY_FULL_DECODE_FAILED'):
                m.validate_review(review)


    def test_capture_ascent_raster_proof_is_mandatory_for_renderer(self):
        r=record();r['evidence'].pop('ascentRasterMotion')
        with self.assertRaisesRegex(m.HoldRefusal,'CAPTURE_ASCENT_RASTER_MOTION_NOT_PROVEN'):
            m.validate_receipt(r)
        for field, value in [('verified',False),('strongPairs',1),('firstHalfStrongPairs',1),('secondHalfStrongPairs',1),('sampleMethod','unverified')]:
            r=record();r['evidence']['ascentRasterMotion'][field]=value
            with self.assertRaisesRegex(m.HoldRefusal,'CAPTURE_ASCENT_RASTER_MOTION_NOT_PROVEN'):
                m.validate_receipt(r)

    def test_decrypted_ascent_interior_motion_rejects_frozen_and_cut_only_frames(self):
        pixels = 16*12
        def make_frames(generator):
            return bytes(generator(i,p) % 256 for i in range(24) for p in range(pixels))
        moving=m.inspect_ascent_decoded_grayscale(make_frames(lambda i,p: p*5+i*13),16,12)
        self.assertTrue(moving['verified'])
        self.assertGreaterEqual(moving['strongPairs'],6)
        frozen=m.inspect_ascent_decoded_grayscale(make_frames(lambda i,p: 60),16,12)
        self.assertFalse(frozen['verified'])
        single_cut=m.inspect_ascent_decoded_grayscale(make_frames(lambda i,p: 20 if i<12 else 190),16,12)
        self.assertFalse(single_cut['verified'])
        burst=m.inspect_ascent_decoded_grayscale(make_frames(lambda i,p: (p*11+i*21) if 10<=i<=12 else 44),16,12)
        self.assertFalse(burst['verified'])

    def test_ascent_video_physical_decode_failure_refuses_render(self):
        from unittest.mock import patch
        class FailedProcess:
            returncode=1
            stdout=b''
        with patch.object(m.subprocess,'run',return_value=FailedProcess()):
            with self.assertRaisesRegex(m.HoldRefusal,'DECRYPTED_ASCENT_RASTER_FFMPEG_FAILED'):
                m.verify_ascent_video_raster(Path('/not-real/ascent.webm'))


if __name__=='__main__':unittest.main()
