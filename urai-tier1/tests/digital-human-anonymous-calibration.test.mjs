import test from 'node:test'
import assert from 'node:assert/strict'
import {calibrationPose,makeToneWav,writeMorphs,clearMorphs} from '../src/spatial/digital-human/anonymousCalibration.mjs'
test('neutral without audio',()=>assert.equal(calibrationPose(.4,false).jawOpen,0))
test('real clock sample drives jaw',()=>assert.ok(calibrationPose(.3,true).jawOpen>.5))
test('mute neutralizes channels',()=>assert.ok(Object.values(calibrationPose(.3,true,false,true)).every(x=>x===0)))
test('reduced-motion lowers amplitude',()=>assert.ok(calibrationPose(.3,true,true).jawOpen<calibrationPose(.3,true).jawOpen))
test('after duration weights neutral',()=>assert.ok(Object.values(calibrationPose(3,true)).every(x=>x===0)))
test('synthetic tone forms real PCM WAV header',()=>{const b=makeToneWav();assert.equal(b.byteLength,73644);assert.equal(Buffer.from(b.slice(0,4)).toString(),'RIFF')})
test('morph buffers update then clear',()=>{const a=new Float32Array(2);const root={traverse(fn){fn({morphTargetDictionary:{jawOpen:0,AA:1},morphTargetInfluences:a})}};assert.equal(writeMorphs(root,calibrationPose(.3,true)).written,2);assert.ok(a[0]>.5);clearMorphs(root);assert.equal(a[0],0)})
test('anonymous fixture never certifies Founder voice or image',()=>{const p=calibrationPose(.3,true);assert.ok(!('founderApproved' in p));assert.ok(!('voiceId' in p))})
test('extended capture profile sustains REAL audio-clock morphs across macOS compositor delay',()=>{
 assert.ok(calibrationPose(.5,true,false,false,'capture').jawOpen>.5)
 assert.ok(calibrationPose(1.600646,true,true,false,'capture').AA>.32)
 assert.ok(calibrationPose(7,true,false,false,'capture').jawOpen>.5)
 assert.equal(calibrationPose(8.5,true,false,false,'capture').jawOpen,0)
 assert.equal(calibrationPose(1.6,true,false,true,'capture').jawOpen,0)
 const wav=makeToneWav('capture')
 assert.equal(wav.length,288044)
 assert.equal(new DataView(wav.buffer,wav.byteOffset,wav.byteLength).getUint32(40,true),288000)
})
