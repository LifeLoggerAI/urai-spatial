import test from 'node:test';
import assert from 'node:assert/strict';
import {createFounderCharacterPlaybackGate} from '../src/spatial/digital-human/founderCharacterPlaybackGate.mjs';
const H='f'.repeat(64),V='e'.repeat(64);
const AUTH=()=>({accountId:'owner-a',subjectId:'adam',identityKind:'founder',actorEpoch:'epoch-1',aiConsent:true,voiceConsent:true,likenessApproved:true,modelAdmitted:true,modelSha256:H,voiceAdmitted:true,approvedVoiceId:'adam-private-approved',voiceApprovalSha256:V,providerEnabled:true,revoked:false});
class Media{constructor(){this.paused=true;this.ended=false;this.muted=false;this.currentTime=0}async play(){this.paused=false}pause(){this.paused=true}}
function setup(){const auth=AUTH(),frames=[],neutrals=[],aborts=[];let verify=async()=>true;const gate=createFounderCharacterPlaybackGate({ownerAccountId:'owner-a',getAuthority:()=>auth,verifyAuthorizedVoice:x=>verify(x),onFaceFrame:x=>frames.push(x),onNeutral:x=>neutrals.push(x),abortConversation:x=>aborts.push(x)});return{auth,gate,frames,neutrals,aborts,setVerifier:f=>verify=f}}
const voiced=(id,m)=>({id,media:m,audioSha256:H,voiceId:'adam-private-approved',voiceApprovalSha256:V,providerReceipt:{source:'test-only-not-certification'}});
test('not active until Founder likeness admitted',()=>{const x=setup();x.auth.modelAdmitted=false;assert.equal(x.gate.beginTurn(),null)});
test('Council persona is not Founder',()=>{const x=setup();x.auth.identityKind='council';assert.equal(x.gate.beginTurn(),null)});
test('account isolation',()=>{const x=setup();x.auth.accountId='owner-b';assert.equal(x.gate.beginTurn(),null)});
test('text turn does not automatically voice',()=>{const x=setup(),id=x.gate.beginTurn();assert.ok(id>0);assert.equal(x.gate.frame(id),false);assert.equal(x.frames.length,0)});
test('unapproved provider denies voice',async()=>{const x=setup(),id=x.gate.beginTurn(),m=new Media();x.setVerifier(async()=>false);assert.equal(await x.gate.startAuthorizedAudio(voiced(id,m)),false);assert.equal(m.paused,true)});
test('audio clock not stream-text arrival',async()=>{const x=setup(),id=x.gate.beginTurn(),m=new Media();assert.equal(await x.gate.startAuthorizedAudio(voiced(id,m)),true);m.currentTime=.4;assert.equal(x.gate.frame(id),true);m.currentTime=.1;assert.equal(x.gate.frame(id),true);assert.deepEqual(x.frames.map(q=>q.audioSeconds),[.4,.1]);x.gate.dispose()});
test('account epoch invalidates old audio',async()=>{const x=setup(),id=x.gate.beginTurn(),m=new Media();await x.gate.startAuthorizedAudio(voiced(id,m));x.auth.actorEpoch='epoch-2';assert.equal(x.gate.frame(id),false);assert.equal(m.paused,true);assert.equal(x.frames.length,0)});
test('voice-consent revocation neutralizes',async()=>{const x=setup(),id=x.gate.beginTurn(),m=new Media();await x.gate.startAuthorizedAudio(voiced(id,m));x.auth.voiceConsent=false;assert.equal(x.gate.frame(id),false);assert.equal(m.paused,true);assert.ok(x.neutrals.includes('authority-changed'))});
test('muting neutralizes face',async()=>{const x=setup(),id=x.gate.beginTurn(),m=new Media();await x.gate.startAuthorizedAudio(voiced(id,m));m.muted=true;assert.equal(x.gate.frame(id),false);assert.ok(x.neutrals.includes('muted'))});
test('late provider verification discarded after interrupt',async()=>{const x=setup(),id=x.gate.beginTurn(),m=new Media();let permit;x.setVerifier(()=>new Promise(resolve=>permit=resolve));const p=x.gate.startAuthorizedAudio(voiced(id,m));x.gate.interrupt();permit(true);assert.equal(await p,false);assert.equal(m.paused,true)});
test('voice-resource change terminates',async()=>{const x=setup(),id=x.gate.beginTurn(),m=new Media();await x.gate.startAuthorizedAudio(voiced(id,m));x.auth.approvedVoiceId='another';assert.equal(x.gate.frame(id),false);assert.equal(x.frames.length,0)});
test('model revoked stops audio',async()=>{const x=setup(),id=x.gate.beginTurn(),m=new Media();await x.gate.startAuthorizedAudio(voiced(id,m));x.auth.revoked=true;assert.equal(x.gate.frame(id),false);assert.equal(m.paused,true)});
test('old turn cannot resurrect',async()=>{const x=setup(),id=x.gate.beginTurn(),m=new Media();await x.gate.startAuthorizedAudio(voiced(id,m));x.gate.interrupt();assert.equal(x.gate.frame(id),false);assert.equal(x.gate.snapshot().hasTurn,false)});
test('dispose permanent and idempotent',()=>{const x=setup();x.gate.dispose();x.gate.dispose();assert.equal(x.gate.beginTurn(),null)});
test('injected provider verifier mandatory',()=>assert.throws(()=>createFounderCharacterPlaybackGate({ownerAccountId:'owner-a',getAuthority:AUTH,onFaceFrame:()=>{},onNeutral:()=>{},abortConversation:()=>{}}),/trusted-injected-authority/));
test('old failed play cannot cancel new turn',async()=>{const x=setup(),first=x.gate.beginTurn(),m=new Media();let rejectPlay;m.play=()=>new Promise((_r,j)=>rejectPlay=j);const p=x.gate.startAuthorizedAudio(voiced(first,m));await Promise.resolve();await Promise.resolve();x.gate.interrupt();const second=x.gate.beginTurn();assert.ok(second>first);rejectPlay(Error('autoplay'));assert.equal(await p,false);assert.equal(x.gate.snapshot().hasTurn,true)});
test('facial callback fault neutralizes audio',async()=>{const a=AUTH(),neutral=[],m=new Media();const gate=createFounderCharacterPlaybackGate({ownerAccountId:'owner-a',getAuthority:()=>a,verifyAuthorizedVoice:async()=>true,onFaceFrame:()=>{throw Error('renderer reset')},onNeutral:x=>neutral.push(x),abortConversation:()=>{}});const id=gate.beginTurn();assert.equal(await gate.startAuthorizedAudio(voiced(id,m)),true);m.currentTime=.25;assert.equal(gate.frame(id),false);assert.equal(m.paused,true);assert.ok(neutral.includes('facial-render-failed'))});
test('duplicate start cannot call provider verifier twice',async()=>{const x=setup(),id=x.gate.beginTurn(),a=new Media(),b=new Media();let resolve,attempts=0;x.setVerifier(()=>{attempts++;return new Promise(r=>resolve=r)});const p=x.gate.startAuthorizedAudio(voiced(id,a));assert.equal(await x.gate.startAuthorizedAudio(voiced(id,b)),false);assert.equal(attempts,1);resolve(true);assert.equal(await p,true);assert.equal(b.paused,true);x.gate.dispose()});
test('denied turn cannot be reactivated with new media',async()=>{const x=setup(),id=x.gate.beginTurn(),a=new Media();x.setVerifier(async()=>false);assert.equal(await x.gate.startAuthorizedAudio(voiced(id,a)),false);x.setVerifier(async()=>true);assert.equal(await x.gate.startAuthorizedAudio(voiced(id,new Media())),false);x.gate.dispose()});
test('voice identity changed during provider verification is denied before media.play',async()=>{
  const x=setup(),id=x.gate.beginTurn(),m=new Media()
  let release,playCalls=0
  m.play=async()=>{playCalls++;m.paused=false}
  x.setVerifier(()=>new Promise(resolve=>release=resolve))
  const pending=x.gate.startAuthorizedAudio(voiced(id,m))
  x.auth.approvedVoiceId='rotated-approved-voice'
  release(true)
  assert.equal(await pending,false)
  assert.equal(playCalls,0)
  assert.equal(m.paused,true)
  x.gate.dispose()
})
test('voice approval hash changed during provider verification is denied before media.play',async()=>{
  const x=setup(),id=x.gate.beginTurn(),m=new Media()
  let release,playCalls=0
  m.play=async()=>{playCalls++;m.paused=false}
  x.setVerifier(()=>new Promise(resolve=>release=resolve))
  const pending=x.gate.startAuthorizedAudio(voiced(id,m))
  x.auth.voiceApprovalSha256='c'.repeat(64)
  release(true)
  assert.equal(await pending,false)
  assert.equal(playCalls,0)
  assert.equal(m.paused,true)
  x.gate.dispose()
})
