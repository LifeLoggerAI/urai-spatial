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
    ('home',300), ('home-first-person',4200), ('home-ascent',5000),
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


if __name__=='__main__':unittest.main()
