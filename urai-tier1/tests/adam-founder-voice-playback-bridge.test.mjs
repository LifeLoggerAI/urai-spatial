import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { createAdamFounderVoicePlaybackBridge } from '../src/spatial/adam/founderVoicePlaybackBridge.mjs'

// Synthetic bytes and mock media ONLY. This is not real Founder approval.
const BYTES = new TextEncoder().encode('synthetic-test-audio-not-a-human-voice')
const SAMPLE = new Blob([BYTES], { type:'audio/mpeg' })
const SHA = createHash('sha256').update(BYTES).digest('hex')
const H = 'f'.repeat(64), V = 'e'.repeat(64)
const authority = () => ({accountId:'owner-a',subjectId:'adam',identityKind:'founder',actorEpoch:'epoch-1',
  aiConsent:true,voiceConsent:true,likenessApproved:true,modelAdmitted:true,modelSha256:H,
  voiceAdmitted:true,approvedVoiceId:'synthetic-approved',voiceApprovalSha256:V,providerEnabled:true,revoked:false})
const evidence = () => ({audioSha256:SHA,voiceId:'synthetic-approved',voiceApprovalSha256:V,
  providerReceipt:{synthetic:true,notRealFounder:true}})
async function waitUntil(check) {
  for(let i=0;i<300;i++) { if(check()) return; await new Promise(resolve=>setTimeout(resolve,1)) }
  throw Error('Provider verification was never reached; the gate refused early')
}
class Media {
  constructor(){this.paused=true;this.ended=false;this.muted=false;this.currentTime=0;this.src='';this.playCalls=0;this.pauseCalls=0;this.onended=null;this.onerror=null}
  async play(){this.playCalls++;this.paused=false}
  pause(){this.pauseCalls++;this.paused=true}
}
function harness(overrides={}) {
  const actor=authority(), medias=[], urls=[], revoked=[], frames=[], neutral=[], schedule=new Map()
  let next=0, verify=async()=>true
  const cfg={ownerAccountId:'owner-a',getAuthority:()=>actor,verifyAuthorizedVoice:(receipt)=>verify(receipt),
    createObjectURL:()=>{const url='blob:synthetic-'+(++next);urls.push(url);return url},
    revokeObjectURL:url=>revoked.push(url),
    createAudio:()=>{const media=new Media();medias.push(media);return media},
    requestFrame:fn=>{const token=++next;schedule.set(token,fn);return token},
    cancelFrame:token=>schedule.delete(token),
    onFaceFrame:f=>frames.push(f),onNeutral:r=>neutral.push(r),abortConversation:()=>{},...overrides}
  const bridge=createAdamFounderVoicePlaybackBridge(cfg)
  return {actor,medias,urls,revoked,frames,neutral,schedule,bridge,setVerifier:fn=>verify=fn,
    tick(){const first=schedule.entries().next().value;if(!first)throw Error('No scheduled frame');schedule.delete(first[0]);first[1]()}}
}
test('missing trusted authority injection fails closed before constructing media',async()=>{
  let create=0
  const bridge=createAdamFounderVoicePlaybackBridge({createAudio:()=>{create++;return new Media()}})
  assert.equal(bridge.ready(),false)
  assert.equal(await bridge.start({blob:SAMPLE,evidence:evidence()}),false)
  assert.equal(create,0)
})
test('audio Blob without per-turn evidence cannot play or allocate media',async()=>{
  const h=harness()
  assert.equal(await h.bridge.start({blob:SAMPLE}),false)
  assert.equal(h.medias.length,0)
  assert.equal(h.urls.length,0)
})
test('malformed or missing approval voice/hash is denied before URL creation',async()=>{
  for(const change of [{voiceId:''},{voiceApprovalSha256:''},{voiceApprovalSha256:'f'.repeat(64).slice(1)},{providerReceipt:null}]){
    const h=harness()
    assert.equal(await h.bridge.start({blob:SAMPLE,evidence:{...evidence(),...change}}),false)
    assert.equal(h.urls.length,0)
  }
})
test('audio hash mismatch denies before creating media',async()=>{
  const h=harness()
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:{...evidence(),audioSha256:'a'.repeat(64)}}),false)
  assert.equal(h.medias.length,0)
})
test('different logged-in owner or actor epoch fails closed',async()=>{
  for (const change of [{accountId:'owner-b'},{actorEpoch:'bad epoch'},{subjectId:'council'},{identityKind:'council'}]) {
    const h=harness();Object.assign(h.actor,change)
    assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),false)
    assert.equal(h.medias.length,0)
  }
})
test('missing admitted Founder likeness/model/consent fails closed',async()=>{
  for(const change of [{likenessApproved:false},{modelAdmitted:false},{modelSha256:''},{aiConsent:false},{voiceConsent:false},{voiceAdmitted:false},{providerEnabled:false},{revoked:true}]){
    const h=harness();Object.assign(h.actor,change)
    assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),false)
    assert.equal(h.medias[0]?.playCalls ?? 0,0)
  }
})
test('trusted verifier denial or rejection never invokes audio.play()',async()=>{
  for(const fail of [async()=>false,async()=>{throw Error('provider rejected')}] ){
    const h=harness();h.setVerifier(fail)
    assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),false)
    assert.equal(h.medias[0].playCalls,0)
    assert.equal(h.medias[0].paused,true)
    assert.deepEqual(h.revoked,h.urls)
  }
})
test('approved voice identity rotation during verification denies BEFORE play',async()=>{
  const h=harness();let release;h.setVerifier(()=>new Promise(resolve=>{release=resolve}))
  const pending=h.bridge.start({blob:SAMPLE,evidence:evidence()})
  await waitUntil(()=>release)
  h.actor.approvedVoiceId='rotated-synthetic-voice';release(true)
  assert.equal(await pending,false);assert.equal(h.medias[0].playCalls,0)
  assert.deepEqual(h.revoked,h.urls)
})
test('approval SHA rotation during verification denies BEFORE play',async()=>{
  const h=harness();let release;h.setVerifier(()=>new Promise(resolve=>{release=resolve}))
  const pending=h.bridge.start({blob:SAMPLE,evidence:evidence()})
  await waitUntil(()=>release)
  h.actor.voiceApprovalSha256='c'.repeat(64);release(true)
  assert.equal(await pending,false);assert.equal(h.medias[0].playCalls,0)
  assert.deepEqual(h.revoked,h.urls)
})
test('consent revoked during pending verification and late provider success denied',async()=>{
  const h=harness();let release;h.setVerifier(()=>new Promise(resolve=>{release=resolve}))
  const pending=h.bridge.start({blob:SAMPLE,evidence:evidence()})
  await waitUntil(()=>release)
  h.actor.voiceConsent=false;release(true)
  assert.equal(await pending,false);assert.equal(h.medias[0].playCalls,0)
  assert.deepEqual(h.revoked,h.urls)
})
test('interrupt during provider verification cannot start stale audio',async()=>{
  const h=harness();let release;h.setVerifier(()=>new Promise(resolve=>{release=resolve}))
  const pending=h.bridge.start({blob:SAMPLE,evidence:evidence()})
  await waitUntil(()=>release)
  h.bridge.interrupt();release(true)
  assert.equal(await pending,false);assert.equal(h.medias[0].playCalls,0)
  assert.deepEqual(h.revoked,h.urls)
})
test('session abort during verification cannot resume cancelled audio',async()=>{
  const h=harness(),controller=new AbortController();let release
  h.setVerifier(()=>new Promise(resolve=>{release=resolve}))
  const pending=h.bridge.start({blob:SAMPLE,evidence:evidence(),signal:controller.signal})
  await waitUntil(()=>release)
  controller.abort();release(true)
  assert.equal(await pending,false);assert.equal(h.medias[0].playCalls,0)
  assert.deepEqual(h.revoked,h.urls)
})
test('duplicate starts within one turn cannot invoke voice twice',async()=>{
  const h=harness();let release,verifyCount=0;h.setVerifier(()=>{verifyCount++;return new Promise(resolve=>{release=resolve})})
  const first=h.bridge.start({blob:SAMPLE,evidence:evidence()})
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),false)
  await waitUntil(()=>release)
  release(true);assert.equal(await first,true)
  assert.equal(verifyCount,1);assert.equal(h.medias.length,1);assert.equal(h.medias[0].playCalls,1)
  h.bridge.dispose()
})
test('synthetic trusted verifier authorizes one bounded playback and visual frame',async()=>{
  const h=harness();assert.equal(h.bridge.ready(),true)
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),true)
  assert.equal(h.medias[0].playCalls,1)
  h.medias[0].currentTime=.5;h.tick()
  assert.equal(h.frames.length,1);assert.equal(h.frames[0].audioSeconds,.5)
  h.bridge.dispose()
  assert.equal(h.medias[0].paused,true);assert.deepEqual(h.revoked,h.urls)
  assert.equal(h.schedule.size,0)
})
test('revocation during playback stops and cleans URL on next monitored frame',async()=>{
  const h=harness();assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),true)
  h.actor.revoked=true;h.tick()
  assert.equal(h.medias[0].paused,true);assert.equal(h.bridge.isPlaying(),false)
  assert.deepEqual(h.revoked,h.urls);assert.equal(h.schedule.size,0)
})
test('late onended callback does not cancel replacement turn or double-revoke URLs',async()=>{
  const h=harness();assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),true)
  const stale=h.medias[0].onended
  h.bridge.interrupt()
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),true)
  stale();assert.equal(h.bridge.isPlaying(),true)
  h.medias[1].onended();assert.equal(h.bridge.isPlaying(),false)
  assert.deepEqual(h.revoked,h.urls)
})
test('frame monitor installation failure pauses audio and revokes URL',async()=>{
  const h=harness({requestFrame:()=>{throw Error('scheduler unavailable')}})
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),false)
  assert.equal(h.medias[0].playCalls,1)
  assert.equal(h.medias[0].paused,true)
  assert.deepEqual(h.revoked,h.urls)
})
test('disposed bridge cannot return to playable state',async()=>{
  const h=harness();h.bridge.dispose();assert.equal(h.bridge.ready(),false)
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),false)
  assert.equal(h.urls.length,0)
})

// R508 fault-injection cases: external frame and signal callbacks must never
// prevent final media/URL cleanup or resurrect the Founder voice lifetime.
test('interrupt completes URL cleanup even if animation-frame cancel throws',async()=>{
  const h=harness({cancelFrame:()=>{throw Error('cancelFrame fault')}})
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),true)
  assert.doesNotThrow(()=>h.bridge.interrupt())
  assert.equal(h.medias[0].paused,true)
  assert.equal(h.medias[0].src,'')
  assert.deepEqual(h.revoked,h.urls)
  assert.equal(h.bridge.isPlaying(),false)
})
test('dispose stays terminal even if frame cancellation throws',async()=>{
  const h=harness({cancelFrame:()=>{throw Error('cancelFrame fault')}})
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),true)
  assert.doesNotThrow(()=>h.bridge.dispose())
  assert.equal(h.bridge.ready(),false)
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),false)
  assert.deepEqual(h.revoked,h.urls)
})
test('abort listener removal fault cannot skip pause and URL revocation',async()=>{
  const h=harness()
  const signal={aborted:false,addEventListener(){},removeEventListener(){throw Error('detach fault')}}
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence(),signal}),true)
  assert.doesNotThrow(()=>h.bridge.interrupt())
  assert.equal(h.medias[0].paused,true)
  assert.deepEqual(h.revoked,h.urls)
})
test('audio-ended cleanup stays fail-closed if frame cancellation faults',async()=>{
  const h=harness({cancelFrame:()=>{throw Error('cancelFrame fault')}})
  assert.equal(await h.bridge.start({blob:SAMPLE,evidence:evidence()}),true)
  assert.doesNotThrow(()=>h.medias[0].onended())
  assert.equal(h.medias[0].paused,true)
  assert.deepEqual(h.revoked,h.urls)
})

test('verified synthetic Founder playback preserves the captured Urdu locale', async () => {
  const locales = []
  const h = harness({ createAudio: (_url, locale) => {
    locales.push(locale)
    const media = new Media()
    media.lang = locale
    return media
  } })
  try {
    assert.equal(await h.bridge.start({ blob: SAMPLE, evidence: evidence(), locale: 'ur-PK' }), true)
    assert.deepEqual(locales, ['ur-PK'])
    assert.equal(h.bridge.isPlaying(), true)
  } finally { h.bridge.dispose() }
})
