import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createHumanMorphDriver, verifyPrivateGlbBytes } from '../src/spatial/digital-human/humanMorphDriver.mjs'
import { createHumanEncounter } from '../src/spatial/digital-human/humanEncounter.mjs'

const a = 'a'.repeat(64)
function glb() {
  const json = Buffer.from(JSON.stringify({asset:{version:'2.0'},scenes:[{}]}))
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20)
  json.copy(padded)
  const data = Buffer.alloc(20+padded.length)
  data.writeUInt32LE(0x46546c67,0);data.writeUInt32LE(2,4)
  data.writeUInt32LE(data.length,8);data.writeUInt32LE(padded.length,12)
  data.writeUInt32LE(0x4e4f534a,16);padded.copy(data,20)
  return data
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const approved = sha => ({schema:'urai.digital-human.admission.v1',accountId:'account-a',subjectId:'adam',
  consent:{state:'active',receiptSha256:a},identity:{approved:true,approvalType:'literal-human-review',receiptSha256:a},
  rights:{voice:true,likeness:true,commercialUse:true},model:{delivery:'authenticated-private',sha256:sha,approved:true,qcReceiptSha256:a},
  provenance:{sourceApproved:true,receiptSha256:a},provider:{enabled:true,revoked:false}})
function root(morphNames=['jawOpen','AA']) {
  const mesh = {morphTargetDictionary:Object.fromEntries(morphNames.map((s,i)=>[s,i])),
    morphTargetInfluences:new Float32Array(morphNames.length)}
  return {traverse(cb){cb(mesh)}, mesh}
}
async function rig({names=['jawOpen','AA'],accountId='account-a'}={}) {
  const bytes=glb(),hash=sha(bytes),modelProof=await verifyPrivateGlbBytes(bytes,hash)
  const manifest=approved(hash)
  const authority={accountId,subjectId:'adam',sessionEpoch:'session-1',consentActive:true,providerEnabled:true}
  const scene=root(names),encounter=createHumanEncounter()
  encounter.track(1)
  const getAuthority=()=>authority
  const driver=createHumanMorphDriver({root:scene,manifest,modelProof,getAuthority,morphNames:names,encounter})
  return {bytes,hash,modelProof,manifest,authority,scene,encounter,driver,
    begin(){const turn=encounter.beginTurn({consentActive:true,permitted:true});assert.ok(turn);assert.equal(driver.beginAudio({turnId:turn,audioSha256:hash}),true);return turn}}
}
test('1 real GLB sha proof is accepted',async()=>{const b=glb();assert.equal((await verifyPrivateGlbBytes(b,sha(b))).ok,true)})
test('2 altered GLB bytes cannot reuse proof',async()=>{const b=glb();const hash=sha(b);b[b.length-1]=0;assert.equal((await verifyPrivateGlbBytes(b,hash)).ok,false)})
test('3 garbage GLB header is rejected',async()=>assert.equal((await verifyPrivateGlbBytes(Buffer.alloc(40),a)).ok,false))
test('4 invalid expected SHA fails closed',async()=>assert.equal((await verifyPrivateGlbBytes(glb(),'wrong')).ok,false))
test('5 malformed JSON chunk is rejected',async()=>{const b=glb();b[20]=0;assert.equal((await verifyPrivateGlbBytes(b,sha(b))).ok,false)})
test('6 oversized declared length is rejected',async()=>{const b=glb();b.writeUInt32LE(b.length+5,8);assert.equal((await verifyPrivateGlbBytes(b,sha(b))).ok,false)})
test('7 incomplete chunk header is rejected',async()=>{const b=glb();b.writeUInt32LE(b.readUInt32LE(12)+8,12);assert.equal((await verifyPrivateGlbBytes(b,sha(b))).ok,false)})
test('8 missing root fails explicit construction',()=>assert.throws(()=>createHumanMorphDriver({}),/scene-root/))
test('9 missing morph name approval fails construction',()=>assert.throws(()=>createHumanMorphDriver({root:root(),morphNames:[]}),/approved-morph/))
test('10 model lacking permitted morph targets is rejected',async()=>{const r=await rig();r.driver.dispose();assert.throws(()=>createHumanMorphDriver({root:root(['jawOpen']),manifest:r.manifest,modelProof:r.modelProof,getAuthority:()=>r.authority,morphNames:['AA']}),/no-approved-facial-targets/)})
test('11 exact approved manifest and current auth allow driver',async()=>{const r=await rig();assert.equal(r.driver.snapshot().permitted,true);r.driver.dispose()})
test('12 no proximity disallows starting speech',async()=>{const r=await rig();r.encounter.track(8);assert.equal(r.driver.beginAudio({turnId:1,audioSha256:r.hash}),false);r.driver.dispose()})
test('13 unapproved identity blocks real frames',async()=>{const r=await rig();const turn=r.begin();r.manifest.identity.approved=false;assert.equal(r.driver.frame({turnId:turn,audioSha256:r.hash,audioSeconds:.2,playing:true,rms:.8}).permitted,false);r.driver.dispose()})
test('14 measured RMS is reported as amplitude only',async()=>{const r=await rig();const turn=r.begin();const result=r.driver.frame({turnId:turn,audioSha256:r.hash,audioSeconds:.2,playing:true,rms:.8});assert.equal(result.mode,'amplitude-only-not-lipsync');assert.ok(r.scene.mesh.morphTargetInfluences[0]>0);r.driver.dispose()})
test('15 exact audio clock drives verified timed visemes',async()=>{const r=await rig();const turn=r.begin(),timeline={approved:true,audioSha256:r.hash,cues:[{morph:'AA',startSec:0,endSec:.7,weight:.9}]};assert.equal(r.driver.frame({turnId:turn,audioSha256:r.hash,audioSeconds:.3,playing:true,rms:0,timeline}).mode,'audio-clock-visemes');assert.ok(r.scene.mesh.morphTargetInfluences[1]>0);r.driver.dispose()})
test('16 false viseme hash yields silence, not claimed lip sync',async()=>{const r=await rig();const turn=r.begin(),timeline={approved:true,audioSha256:'b'.repeat(64),cues:[{morph:'AA',startSec:0,endSec:.7,weight:.9}]};assert.equal(r.driver.frame({turnId:turn,audioSha256:r.hash,audioSeconds:.3,playing:true,rms:.5,timeline}).reason,'unverified-viseme-timeline');r.driver.dispose()})
test('17 mute and stop both return facial buffers to neutral',async()=>{const r=await rig();const turn=r.begin();r.driver.frame({turnId:turn,audioSha256:r.hash,audioSeconds:.2,playing:true,rms:.8});assert.ok(r.scene.mesh.morphTargetInfluences[0]>0);r.driver.frame({turnId:turn,audioSha256:r.hash,audioSeconds:.25,playing:true,muted:true,rms:.8});assert.equal(r.scene.mesh.morphTargetInfluences[0],0);r.driver.dispose()})
test('18 session swap, stale turn and shared instances fail safely',async()=>{const r=await rig();const turn=r.begin();const fake={...r.scene,traverse:r.scene.traverse.bind(r.scene)};assert.throws(()=>createHumanMorphDriver({root:fake,manifest:r.manifest,modelProof:r.modelProof,getAuthority:()=>r.authority,morphNames:['jawOpen'],encounter:r.encounter}),/shared-character-morph-buffer/);r.authority.sessionEpoch='session-2';assert.equal(r.driver.frame({turnId:turn,audioSha256:r.hash,audioSeconds:.2,playing:true,rms:.8}).reason,'not-currently-speaking');r.driver.dispose()})
test('19 changed actor epoch plus mismatched frame clears the previous face and encounter',async()=>{
  const r=await rig()
  const turn=r.begin()
  r.driver.frame({turnId:turn,audioSha256:r.hash,audioSeconds:.2,playing:true,rms:.8})
  assert.ok(r.scene.mesh.morphTargetInfluences[0]>0)
  r.authority.sessionEpoch='session-2'
  const result=r.driver.frame({turnId:turn+1,audioSha256:r.hash,audioSeconds:.3,playing:true,rms:.9})
  assert.equal(result.mode,'neutral')
  assert.equal(r.scene.mesh.morphTargetInfluences[0],0)
  assert.equal(r.driver.snapshot().activeTurn,null)
  assert.equal(r.encounter.snapshot().audioPlaying,false)
  r.driver.dispose()
})
test('20 late callback from prior turn cannot cancel valid newer speech',async()=>{
  const r=await rig()
  const first=r.begin()
  r.driver.frame({turnId:first,audioSha256:r.hash,audioSeconds:.2,playing:true,rms:.8})
  const second=r.begin()
  r.driver.frame({turnId:second,audioSha256:r.hash,audioSeconds:.2,playing:true,rms:.8})
  const before=r.scene.mesh.morphTargetInfluences[0]
  assert.ok(before>0)
  assert.equal(r.driver.frame({turnId:first,audioSha256:r.hash,audioSeconds:.25,playing:true,rms:.9}).mode,'stale-turn-ignored')
  assert.equal(r.scene.mesh.morphTargetInfluences[0],before)
  assert.equal(r.driver.snapshot().activeTurn,second)
  r.driver.dispose()
})
