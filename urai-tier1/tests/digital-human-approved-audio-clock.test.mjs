import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { verifyCouncilAudioBytes, createCouncilApprovedAudioClock, bindCouncilAudioMorph } from '../src/spatial/digital-human/councilApprovedAudioClock.mjs'
const sha = b => createHash('sha256').update(b).digest('hex')
const h = 'a'.repeat(64)
class FakeAudio {
  constructor() { this.paused=true; this.ended=false; this.muted=false; this.currentTime=0; this.handlers=new Map(); this.playDeferred=null }
  addEventListener(k,v) { const a=this.handlers.get(k)??[]; a.push(v); this.handlers.set(k,a) }
  removeEventListener(k,v) { this.handlers.set(k,(this.handlers.get(k)??[]).filter(x=>x!==v)) }
  emit(k) { (this.handlers.get(k)??[]).forEach(x=>x()) }
  async play() { if(this.playDeferred) await this.playDeferred; this.paused=false; this.emit('playing') }
  pause() { this.paused=true; this.emit('pause') }
}
async function setup() {
  const bytes=Buffer.alloc(1024,56), proof=await verifyCouncilAudioBytes(bytes,sha(bytes))
  assert.ok(proof)
  const speaker={accountId:'owner',actorGeneration:1,agentId:'council-archivist',turnId:2,voiceId:'approved-archivist',voiceApprovalSha256:h,audioSha256:proof.audioSha256}
  const authority={...speaker,aiConsent:true,voiceConsent:true,providerEnabled:true,revoked:false}
  const media=new FakeAudio(), frames=[], neutral=[]
  const clock=createCouncilApprovedAudioClock({media,proof,speaker,getAuthority:()=>authority,getRms:()=>.12,onFrame:x=>frames.push(x),onNeutral:reason=>neutral.push(reason)})
  return {proof,speaker,authority,media,frames,neutral,clock}
}
test('verified audio payload SHA required',async()=>{const b=Buffer.alloc(1024,56);assert.equal(await verifyCouncilAudioBytes(b,'f'.repeat(64)),null);assert.equal((await verifyCouncilAudioBytes(b,sha(b))).byteLength,1024)})
test('fabricated proof cannot be admitted',async()=>{const r=await setup();assert.throws(()=>createCouncilApprovedAudioClock({media:r.media,proof:{...r.proof},speaker:r.speaker,getAuthority:()=>r.authority,onFrame:()=>{},onNeutral:()=>{}}),/not-admitted/)})
test('real element clock tracks seeking backwards',async()=>{const r=await setup();assert.equal(await r.clock.start(),true);r.media.currentTime=.4;r.clock.tick();r.media.currentTime=.12;r.clock.tick();assert.deepEqual(r.frames.map(x=>x.audioSeconds),[.4,.12]);r.clock.dispose()})
test('audio frames retain selected actor, persona, turn and SHA',async()=>{const r=await setup();await r.clock.start();r.media.currentTime=.4;r.clock.tick();assert.equal(r.frames[0].agentId,'council-archivist');assert.equal(r.frames[0].actorGeneration,1);assert.equal(r.frames[0].turnId,2);assert.equal(r.frames[0].audioSha256,r.proof.audioSha256);r.clock.dispose()})
test('consent revocation neutralizes and pauses',async()=>{const r=await setup();await r.clock.start();r.authority.voiceConsent=false;r.clock.tick();assert.equal(r.media.paused,true);assert.equal(r.clock.snapshot().stopped,true);assert.ok(r.neutral.includes('authority-revoked'))})
test('character switch cannot reuse voice',async()=>{const r=await setup();await r.clock.start();r.authority.agentId='council-guide';r.clock.tick();assert.equal(r.frames.length,0);assert.equal(r.media.paused,true)})
test('account epoch switch discards audio frames',async()=>{const r=await setup();await r.clock.start();r.authority.actorGeneration=2;assert.equal(r.clock.tick().mode,'neutral');assert.equal(r.media.paused,true)})
test('mute silences facial frames',async()=>{const r=await setup();await r.clock.start();r.media.muted=true;r.clock.tick();assert.equal(r.frames.length,0);assert.ok(r.neutral.includes('muted'));r.clock.dispose()})
test('audio errors and interruption are terminal',async()=>{const r=await setup();await r.clock.start();r.media.emit('error');assert.equal(r.clock.snapshot().stopped,true);assert.equal(r.clock.snapshot().status,'audio-error');r.clock.interrupt();r.clock.dispose()})
test('late play promise cannot resurrect revoked voice',async()=>{const r=await setup();let complete;r.media.playDeferred=new Promise(resolve=>{complete=resolve});const pending=r.clock.start();r.clock.interrupt();complete();assert.equal(await pending,false);assert.equal(r.clock.snapshot().stopped,true);assert.equal(r.media.paused,true)})
test('morph bridge enforces exact turn and SHA',async()=>{const r=await setup();let calls=0,stops=0;const driver={beginAudio:()=>true,frame:()=>{calls++;return{mode:'audio-clock-visemes'}},interrupt:()=>{stops++}};const x=bindCouncilAudioMorph({clock:r.clock,morphDriver:driver,turnId:2,audioSha256:r.proof.audioSha256});assert.equal(x.start(),true);assert.equal(x.onFrame({turnId:3,audioSha256:r.proof.audioSha256}).mode,'neutral');x.onFrame({turnId:2,audioSha256:r.proof.audioSha256,audioSeconds:.4,playing:true,rms:.1});assert.equal(calls,1);x.stop();assert.equal(stops,1)})
test('playback failure never animates',async()=>{const r=await setup();r.media.play=async()=>{throw Error('no audio device')};assert.equal(await r.clock.start(),false);assert.equal(r.frames.length,0);assert.ok(r.neutral.includes('audio-playback-failed'))})
test('late play completion after dispose remains silent and detaches listeners',async()=>{
  const r=await setup();let release;r.media.playDeferred=new Promise(resolve=>{release=resolve});
  const pending=r.clock.start();r.clock.dispose();release();
  assert.equal(await pending,false);assert.equal(r.media.paused,true);
  assert.equal(r.clock.snapshot().disposed,true);
  assert.equal([...r.media.handlers.values()].flat().length,0);
})
test('duplicate pending media.play does not race or pause the admitted audio',async()=>{
  const r=await setup();let release;r.media.playDeferred=new Promise(resolve=>{release=resolve});
  const play=r.media.play.bind(r.media);let attempts=0;r.media.play=()=>{attempts++;return play()};
  const original=r.clock.start();const duplicate=r.clock.start();
  assert.equal(attempts,1);release();
  assert.equal(await original,true);assert.equal(await duplicate,false);
  assert.equal(r.media.paused,false);r.clock.dispose();
})
test('morph stop followed by dispose still unregisters terminal clock handlers',async()=>{
  const r=await setup();let interruptions=0;
  const bridge=bindCouncilAudioMorph({clock:r.clock,turnId:2,audioSha256:r.proof.audioSha256,
    morphDriver:{beginAudio:()=>true,frame:()=>({mode:'neutral'}),interrupt:()=>interruptions++}});
  bridge.stop();bridge.dispose();bridge.dispose();
  assert.equal(r.clock.snapshot().disposed,true);
  assert.equal([...r.media.handlers.values()].flat().length,0);
  assert.equal(interruptions,1);
})

test('failed facial frame callback fails closed without leaving audio playing',async()=>{
  const r=await setup();let frames=0;
  const clock=createCouncilApprovedAudioClock({media:r.media,proof:r.proof,speaker:r.speaker,getAuthority:()=>r.authority,
    getRms:()=>.12,onFrame:()=>{frames++;throw Error('render-context-lost')},onNeutral:reason=>r.neutral.push(reason)})
  assert.equal(await clock.start(),true)
  assert.equal(clock.tick().mode,'neutral')
  assert.equal(r.media.paused,true)
  assert.equal(clock.snapshot().stopped,true)
  assert.ok(r.neutral.includes('audio-frame-failed'))
  assert.equal(clock.tick().mode,'neutral')
  assert.equal(frames,1)
  clock.dispose();r.clock.dispose()
})
test('failed audio analyser callback fails closed before facial animation',async()=>{
  const r=await setup();let frames=0;
  const clock=createCouncilApprovedAudioClock({media:r.media,proof:r.proof,speaker:r.speaker,getAuthority:()=>r.authority,
    getRms:()=>{throw Error('analyser-detached')},onFrame:()=>frames++,onNeutral:reason=>r.neutral.push(reason)})
  assert.equal(await clock.start(),true)
  assert.equal(clock.tick().mode,'neutral')
  assert.equal(r.media.paused,true)
  assert.equal(clock.snapshot().stopped,true)
  assert.ok(r.neutral.includes('audio-level-failed'))
  assert.equal(clock.tick().mode,'neutral')
  assert.equal(frames,0)
  clock.dispose();r.clock.dispose()
})
