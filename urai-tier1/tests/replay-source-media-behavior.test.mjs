import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { Timestamp } from 'firebase/firestore'
import * as ownedPlayback from '../src/spatial/memory/ownedMemoryMediaPlayback.ts'
import { createReplayVideoSession, createReplayMediaSession } from '../src/app/replay/replayMediaSession.ts'
import { replaySessionIdentity, replayVisualAdmission } from '../src/app/replay/replayVisualAdmission.ts'
import { parseSelectedMemory, buildExplicitDemoMemory } from '../src/spatial/memory/selectedMemoryContract.ts'

class FakeVideo extends EventTarget {
  duration = Number.NaN
  currentTime = 0
  readyState = 0
  paused = true
  seeking = false
  ended = false
  muted = true
  src = ''
  error = null
  loadCalls = 0
  playCalls = 0
  playOutcome = null
  load() { this.loadCalls += 1 }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')) }
  play() {
    this.playCalls += 1
    if (this.playOutcome) return this.playOutcome()
    this.paused = false
    this.dispatchEvent(new Event('playing'))
    return Promise.resolve()
  }
  removeAttribute(name) { if (name === 'src') this.src = '' }
  emit(name) { this.dispatchEvent(new Event(name)) }
}

function session(options = {}) {
  const video = new FakeVideo()
  const snapshots = []
  const controls = createReplayVideoSession(video, 'https://example.invalid/owner/source.mp4', (state) => snapshots.push(state), options)
  const latest = () => snapshots.at(-1)
  const decode = (duration = 15) => {
    video.duration = duration
    video.readyState = 1
    video.emit('loadedmetadata')
    video.readyState = 2
    video.emit('loadeddata')
  }
  return { video, snapshots, controls, latest, decode }
}

test('source media admission cannot use demo art for a personal memory or interpret a flat source as a world', () => {
  const demo = buildExplicitDemoMemory('demo:source-test')
  assert.equal(replayVisualAdmission(demo).kind, 'disclosed-demo')
  const personal = { ...demo, demo: false, ownerId: 'owner-a', id: 'personal-a' }
  assert.deepEqual(replayVisualAdmission(personal), { kind: 'neutral', media: null })
  const audio = { kind: 'audio', url: 'https://example.invalid/source.ogg' }
  assert.deepEqual(replayVisualAdmission({ ...personal, sourceMedia: [audio] }), { kind: 'recorded-source', media: audio })
  const source = { kind: 'image', url: 'https://example.invalid/photo.jpg', caption: 'Original photo' }
  assert.deepEqual(replayVisualAdmission({ ...personal, sourceMedia: [source] }), { kind: 'recorded-source', media: source })
})

test('owner, source, manifest, and privacy changes produce a new teardown boundary', () => {
  const memory = buildExplicitDemoMemory('demo:source-test')
  const identity = replaySessionIdentity(memory)
  for (const changed of [
    { ...memory, ownerId: 'another-owner' },
    { ...memory, id: 'another-memory' },
    { ...memory, demo: false },
    { ...memory, privacy: 'hidden' },
    { ...memory, sourceMedia: [{ kind: 'video', url: 'https://example.invalid/new.mp4' }] },
    { ...memory, replayManifest: { ...memory.replayManifest, version: 2 } },
  ]) assert.notEqual(replaySessionIdentity(changed), identity)
})

test('metadata and texture allocation do not establish decoded readiness', () => {
  const { video, controls, latest } = session()
  assert.equal(latest().ready, false)
  video.duration = 15
  video.readyState = 1
  video.emit('loadedmetadata')
  assert.equal(latest().durationMs, 15_000)
  assert.equal(latest().ready, false)
  assert.equal(latest().status, 'loading')
  video.readyState = 2
  video.emit('loadeddata')
  assert.equal(latest().ready, true)
  assert.equal(latest().status, 'ready')
  controls.dispose()
})

test('actual source time owns transport and buffering cannot advance an independent clock', async () => {
  const { video, controls, latest, decode } = session()
  decode()
  await controls.play()
  assert.equal(latest().playing, true)
  assert.equal(latest().currentTimeMs, 0)
  video.currentTime = 3.25
  video.emit('timeupdate')
  assert.equal(latest().currentTimeMs, 3250)
  video.emit('waiting')
  assert.equal(latest().status, 'buffering')
  assert.equal(latest().ready, false)
  assert.equal(latest().currentTimeMs, 3250)
  video.emit('canplay')
  assert.equal(latest().ready, true)
  controls.pause()
  assert.equal(latest().playing, false)
  controls.dispose()
})

test('seek changes the actual video, clamps source bounds, and restarts from zero after ending', async () => {
  const { video, controls, latest, decode } = session()
  decode()
  controls.seek(7200)
  assert.equal(video.currentTime, 7.2)
  assert.equal(latest().currentTimeMs, 7200)
  controls.seek(-100)
  assert.equal(video.currentTime, 0)
  await controls.play()
  controls.seek(20_000)
  assert.equal(video.currentTime, 15)
  assert.equal(video.paused, true)
  assert.equal(latest().status, 'ended')
  await controls.play()
  assert.equal(video.currentTime, 0)
  assert.equal(latest().playing, true)
  controls.dispose()
})

test('a rejected user play request is visible and a subsequent explicit request can recover', async () => {
  const { video, controls, latest, decode } = session()
  decode()
  const denied = new Error('blocked')
  denied.name = 'NotAllowedError'
  video.playOutcome = () => Promise.reject(denied)
  await controls.play()
  assert.equal(latest().status, 'blocked')
  assert.equal(latest().playing, false)
  assert.match(latest().error, /Press Continue memory/)
  video.playOutcome = null
  await controls.play()
  assert.equal(latest().status, 'ready')
  assert.equal(latest().playing, true)
  assert.equal(latest().error, null)
  controls.dispose()
})

test('an obsolete play rejection after pause cannot turn the current paused session into an error', async () => {
  const { video, controls, latest, decode } = session()
  decode()
  let reject
  video.playOutcome = () => new Promise((_resolve, failure) => { reject = failure })
  const pending = controls.play()
  controls.pause()
  reject(new Error('obsolete rejection'))
  await pending
  assert.equal(latest().playing, false)
  assert.equal(latest().error, null)
  assert.notEqual(latest().status, 'error')
  controls.dispose()
})

test('teardown releases the media decoder and ignores late source events and play settlement', async () => {
  const { video, snapshots, controls, decode } = session()
  decode()
  let resolve
  video.playOutcome = () => new Promise((success) => { resolve = success })
  const pending = controls.play()
  const count = snapshots.length
  controls.dispose()
  assert.equal(video.src, '')
  assert.equal(video.paused, true)
  assert.equal(video.loadCalls, 2)
  video.currentTime = 9
  video.emit('timeupdate')
  video.emit('error')
  resolve()
  await pending
  assert.equal(snapshots.length, count)
  controls.seek(10_000)
  await controls.play()
  assert.equal(video.playCalls, 1)
})

test('recorded sound is muted by default and is enabled only by the explicit audio command', () => {
  const { video, controls, latest } = session()
  assert.equal(video.muted, true)
  assert.equal(latest().muted, true)
  assert.equal(latest().audioAllowed, true)
  controls.setMuted(false)
  assert.equal(video.muted, false)
  assert.equal(latest().muted, false)
  controls.dispose()
})

test('sensory-safe denies source unmute while leaving the recorded video transport available', async () => {
  const { video, controls, latest, decode } = session({ audioAllowed: () => false })
  decode()
  controls.setMuted(false)
  assert.equal(video.muted, true)
  assert.equal(latest().audioAllowed, false)
  await controls.play()
  assert.equal(latest().playing, true)
  assert.equal(latest().muted, true)
  controls.dispose()
})

test('sensory-safe activation immediately mutes active source sound and leaving safe never auto-unmutes', async () => {
  let allowed = true
  const { video, controls, latest, decode } = session({ audioAllowed: () => allowed })
  decode()
  controls.setMuted(false)
  await controls.play()
  assert.equal(video.muted, false)
  allowed = false
  controls.refreshAudioPolicy()
  assert.equal(video.muted, true)
  assert.equal(latest().audioAllowed, false)
  assert.equal(latest().playing, true)
  allowed = true
  controls.refreshAudioPolicy()
  assert.equal(video.muted, true)
  assert.equal(latest().audioAllowed, true)
  controls.setMuted(false)
  assert.equal(video.muted, false)
  controls.dispose()
})

test('source unmute evaluates the latest policy even before the UI snapshot has refreshed', () => {
  let allowed = true
  const { video, controls, latest } = session({ audioAllowed: () => allowed })
  assert.equal(latest().audioAllowed, true)
  allowed = false
  controls.setMuted(false)
  assert.equal(video.muted, true)
  assert.equal(latest().audioAllowed, false)
  video.muted = false
  video.emit('volumechange')
  assert.equal(video.muted, true)
  controls.dispose()
})

test('a pending source play cannot restore sound after sensory-safe becomes active', async () => {
  let allowed = true
  let finishPlay
  const { video, controls, latest, decode } = session({ audioAllowed: () => allowed })
  decode()
  controls.setMuted(false)
  video.playOutcome = () => new Promise((resolve) => { finishPlay = resolve })
  const pending = controls.play()
  allowed = false
  controls.refreshAudioPolicy()
  video.paused = false
  finishPlay()
  await pending
  assert.equal(video.muted, true)
  assert.equal(latest().audioAllowed, false)
  controls.dispose()
})

test('recorded-source owner listens to canonical sensory policy and removes its listeners on teardown', () => {
  let safe = false
  let effect
  const video = new FakeVideo()
  const refs = [{ current: null }, { current: video }, { current: null }, { current: true }]
  const snapshots = []
  const sessions = []
  class Surface extends EventTarget {
    listeners = new Map()
    addEventListener(name, listener) { this.listeners.set(name, listener); super.addEventListener(name, listener) }
    removeEventListener(name, listener) { this.listeners.delete(name); super.removeEventListener(name, listener) }
  }
  const surface = new Surface()
  const source = fs.readFileSync(new URL('../src/app/replay/ReplayRecordedSource.tsx', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    exports: module.exports, module, window: surface,
    require: (id) => {
      if (id === 'react') return { useRef: () => refs.shift(), useEffect: (callback) => { effect = callback } }
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) }
      if (id === './replayMediaSession') return { createReplayVideoSession, createReplayMediaSession }
      assert.equal(id, '@/spatial/accessibility/SensorySafeRuntime')
      return { sensorySafeEnabled: () => safe, URAI_SENSORY_SAFE_EVENT: 'urai:sensory-safe-changed', URAI_SENSORY_SAFE_STORAGE_KEY: 'urai:sensory-safe:enabled-v1' }
    },
  })
  module.exports.ReplayRecordedSource({
    media: { kind: 'video', url: 'https://example.invalid/owner/source.mp4' }, title: 'Recorded memory',
    onImageState() {}, onVideoSnapshot: (snapshot) => snapshots.push(snapshot), onVideoSession: (value) => sessions.push(value),
  })
  const cleanup = effect()
  sessions[0].setMuted(false)
  assert.equal(video.muted, false)
  safe = true
  surface.dispatchEvent(new Event('urai:sensory-safe-changed'))
  assert.equal(video.muted, true)
  assert.equal(snapshots.at(-1).audioAllowed, false)
  safe = false
  const storage = new Event('storage')
  Object.defineProperty(storage, 'key', { value: 'urai:sensory-safe:enabled-v1' })
  surface.dispatchEvent(storage)
  assert.equal(video.muted, true)
  assert.equal(snapshots.at(-1).audioAllowed, true)
  assert.equal(surface.listeners.size, 2)
  cleanup()
  assert.equal(surface.listeners.size, 0)
  assert.equal(sessions.at(-1), null)
  const count = snapshots.length
  safe = true
  surface.dispatchEvent(new Event('urai:sensory-safe-changed'))
  sessions[0].refreshAudioPolicy()
  assert.equal(snapshots.length, count)
})

test('decode errors are truthful, stop time, and cannot be concealed by a new play request', async () => {
  const { video, controls, latest, decode } = session()
  decode()
  await controls.play()
  video.error = { code: 3 }
  video.emit('error')
  assert.equal(latest().status, 'error')
  assert.equal(latest().ready, false)
  assert.equal(latest().playing, false)
  assert.match(latest().error, /could not be decoded/)
  await controls.play()
  assert.equal(video.playCalls, 1)
  controls.dispose()
})

test('an unusable duration fails accessibly instead of exposing a fictitious media timeline', () => {
  const { video, controls, latest } = session()
  video.duration = Number.POSITIVE_INFINITY
  video.readyState = 2
  video.emit('loadedmetadata')
  assert.equal(latest().durationMs, null)
  assert.equal(latest().ready, false)
  assert.equal(latest().status, 'error')
  assert.match(latest().error, /no usable duration/)
  controls.dispose()
})

// Bounded token-wait regressions; included in the existing compact runner.
import { createHash, webcrypto } from 'node:crypto'

// Actual transport source; only time and the token/HTTP boundaries are controlled.
// This is not Firebase, full React-consumer, provider or private-media acceptance.
function harness() {
  const source = fs.readFileSync(new URL('../src/spatial/memory/ownedMemoryMediaPlayback.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }, timers = new Set()
  let now = 1_800_000_000_000
  class Clock extends Date { static now() { return now } }
  vm.runInNewContext(outputText, {
    module, exports: module.exports, Date: Clock, URL, AbortController,
    Uint8Array, Blob, crypto: webcrypto, fetch,
    setTimeout: (callback, delay) => { const timer = { callback, at: now + delay }; timers.add(timer); return timer },
    clearTimeout: timer => timers.delete(timer),
  }, { filename: 'actual-ownedMemoryMediaPlayback.js' })
  const bytes = Buffer.from('synthetic byte transport fixture; not playable family media')
  const descriptor = {
    schemaVersion: 'urai-owned-memory-media-playback-v1', requiresAuthorization: true,
    ownerId: 'synthetic-owner', memoryId: 'synthetic-memory', receiptId: 'a'.repeat(64),
    kind: 'audio', contentType: 'audio/wav', sha256: createHash('sha256').update(bytes).digest('hex'),
    byteLength: bytes.length, storageGeneration: '123', sourceAuthorityHash: 'b'.repeat(64),
    authorityHash: 'c'.repeat(64), expiresAt: now + 1000,
  }
  const abort = new AbortController()
  let requests = 0, headersCalls = 0, current = true
  const lifecycle = {
    signal: abort.signal, isCurrent: () => current,
    requestHeaders: async () => { headersCalls++; return { Authorization: 'Bearer synthetic-owned-token' } },
  }
  const fetcher = async (_url, options) => {
    requests++
    assert.equal(options.headers.Authorization, 'Bearer synthetic-owned-token')
    return new Response(bytes, { status: 200, headers: {
      'content-type': descriptor.contentType, 'content-length': String(bytes.length),
      'x-urai-checksum-sha256': descriptor.sha256, 'x-urai-storage-generation': descriptor.storageGeneration,
    } })
  }
  return {
    descriptor, abort, lifecycle, bytes, timers,
    run: () => module.exports.fetchOwnedMemoryPlayback(descriptor, 'urai-4dc1d', lifecycle, fetcher),
    advance: milliseconds => { now += milliseconds; for (const timer of [...timers]) if (timer.at <= now) { timers.delete(timer); timer.callback() } },
    setCurrent: value => { current = value }, get requests() { return requests }, get headersCalls() { return headersCalls },
  }
}
function deferred() {
  let resolve, reject
  const promise = new Promise((ok, no) => { resolve = ok; reject = no })
  return { promise, resolve, reject }
}
async function drain() { for (let i = 0; i < 20; i++) await Promise.resolve() }
function track(promise) {
  const result = { status: 'pending', value: null }
  const settled = promise.then(value => { result.status = 'fulfilled'; result.value = value }, error => { result.status = 'rejected'; result.value = error })
  return { result, settled }
}

test('authorized token and exact response bytes still produce the original Blob', async () => {
  const h = harness(), blob = await h.run()
  assert.equal(blob.type, h.descriptor.contentType)
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), h.bytes)
  assert.equal(h.requests, 1)
  assert.equal(h.headersCalls, 1)
  assert.equal(h.timers.size, 0)
})

test('unmount abort settles while token refresh remains unresolved', async () => {
  const h = harness(), token = deferred()
  h.lifecycle.requestHeaders = () => token.promise
  const { result, settled } = track(h.run())
  await drain(); h.abort.abort(); await drain()
  const observed = result.status
  token.resolve({ Authorization: 'Bearer synthetic-owned-token' }); await settled
  assert.equal(observed, 'rejected', 'transport remained pending after cancellation of an unresolved token refresh')
  assert.match(result.value.message, /PRIVATE_MEDIA_AUTHORITY_CHANGED/)
  assert.equal(h.requests, 0)
  assert.equal(h.timers.size, 0)
})

test('existing deadline settles token wait without waiting for SDK completion', async () => {
  const h = harness(), token = deferred()
  h.lifecycle.requestHeaders = () => token.promise
  const { result, settled } = track(h.run())
  await drain(); h.advance(1000); await drain()
  const observed = result.status
  token.resolve({ Authorization: 'Bearer synthetic-owned-token' }); await settled
  assert.equal(observed, 'rejected', 'transport remained pending after its existing deadline')
  assert.match(result.value.message, /PRIVATE_MEDIA_AUTHORITY_CHANGED/)
  assert.equal(h.requests, 0)
  assert.equal(h.timers.size, 0)
})

test('late token rejection after cancellation is observed without starting HTTP', async () => {
  const h = harness(), token = deferred()
  h.lifecycle.requestHeaders = () => token.promise
  const { result, settled } = track(h.run())
  await drain(); h.abort.abort(); await drain()
  const observed = result.status
  token.reject(new Error('late SDK rejection')); await settled; await drain()
  assert.equal(observed, 'rejected')
  assert.match(result.value.message, /PRIVATE_MEDIA_AUTHORITY_CHANGED/)
  assert.equal(h.requests, 0)
})

test('current token rejection preserves its original error and releases deadline', async () => {
  const h = harness(), expected = new Error('owned token refresh unavailable')
  h.lifecycle.requestHeaders = async () => { throw expected }
  await assert.rejects(h.run(), error => error === expected)
  assert.equal(h.requests, 0)
  assert.equal(h.timers.size, 0)
})

test('already cancelled request never begins token acquisition', async () => {
  const h = harness(); h.abort.abort()
  await assert.rejects(h.run(), /PRIVATE_MEDIA_AUTHORITY_CHANGED/)
  assert.equal(h.requests, 0)
  assert.equal(h.headersCalls, 0)
  assert.equal(h.timers.size, 0)
})

test('changed current lifecycle before token settlement still prevents HTTP', async () => {
  const h = harness(), token = deferred()
  h.lifecycle.requestHeaders = () => token.promise
  const result = h.run()
  await drain(); h.setCurrent(false); token.resolve({ Authorization: 'Bearer synthetic-owned-token' })
  await assert.rejects(result, /PRIVATE_MEDIA_AUTHORITY_CHANGED/)
  assert.equal(h.requests, 0)
  assert.equal(h.timers.size, 0)
})

test('synchronous token error retains the error and cleans up', async () => {
  const h = harness(), expected = new Error('synchronous owned SDK error')
  h.lifecycle.requestHeaders = () => { throw expected }
  await assert.rejects(h.run(), error => error === expected)
  assert.equal(h.requests, 0)
  assert.equal(h.timers.size, 0)
})


function lifeMovieReleaseHarness() {
  const text = fs.readFileSync(new URL('../src/app/life-movie/LifeMovieClient.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('LifeMovieClient.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let release, advance
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useOwnedMemoryMediaPlayback') release = node.arguments[1]
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
      && node.arguments[0]?.getText(ast).includes('window.setTimeout')
      && node.arguments[0]?.getText(ast).includes('chapterDurationMs')) advance = node.arguments[0]
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.ok(release && advance, 'execute the real disposal and chapter-advance callbacks')
  let playing = false
  const video = new FakeVideo(), timers = [], image = { style: { visibility: 'visible' }, src: 'blob:source', removeAttribute(name) { if (name === 'src') this.src = null } }
  const controls = createReplayMediaSession(video, 'blob:source', snapshot => { playing = snapshot.playing })
  const output = {}
  const context = { exports: output, mediaSession: { current: controls }, imageRef: { current: image },
    setPlaying(value) { playing = typeof value === 'function' ? value(playing) : value },
    active: { id: 'source-less-next-chapter' }, get playing() { return playing },
    expectsPrivateSource: false, ownedPlayback: { status: 'absent' }, timedSource: false,
    memories: [{}, {}], reducedMotion: true, chapterDurationMs: 9000,
    window: { setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length }, clearTimeout() {} },
    setActiveIndex() { throw new Error('a released session must not auto-advance a following chapter') } }
  const compiled = ts.transpileModule('exports.release = ' + release.getText(ast) + '; exports.advance = ' + advance.getText(ast),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(compiled, context)
  return { video, controls, image, timers, release: output.release, advance: output.advance, playing: () => playing }
}

test('Life Movie release resets the playing state even when decoder disposal suppresses snapshots', async () => {
  const h = lifeMovieReleaseHarness()
  h.video.duration = 3; h.video.readyState = 2; h.video.emit('loadedmetadata'); h.video.emit('loadeddata')
  await h.controls.play(); assert.equal(h.playing(), true)
  h.release()
  assert.equal(h.video.paused, true); assert.equal(h.video.src, '')
  assert.equal(h.image.src, null); assert.equal(h.image.style.visibility, 'hidden')
  assert.equal(h.playing(), false, 'withdrawal must not leave Pause film selected')
})

test('released Life Movie media cannot auto-start the source-less chapter timer', async () => {
  const h = lifeMovieReleaseHarness()
  h.video.duration = 3; h.video.readyState = 2; h.video.emit('loadedmetadata'); h.video.emit('loadeddata')
  await h.controls.play(); h.release(); h.advance()
  assert.equal(h.timers.length, 0, 'a following source-less chapter needs a new explicit play action')
})

// Actual hook execution; SDK/HTTP boundary doubles are explicitly synthetic.
const c1HookCode = ts.transpileModule(fs.readFileSync(new URL('../src/spatial/memory/useOwnedMemoryMediaPlayback.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
async function mountC1Playback() {
 const uid='synthetic-owner',id='synthetic-memory',rid='a'.repeat(64),expiry=Date.now()+600000
 const raw={ownerId:uid,title:'Synthetic consent boundary',occurredAt:'2026-01-01T12:00:00.000Z',summary:'Synthetic only',emotionalState:'calm',privacy:'private',sourceMedia:[{kind:'video',mediaReceiptId:rid}],star:{position:[0,0,-4]},replayManifest:{id:'synthetic-manifest',version:1,durationMs:3000,segments:['memory','emotion','pattern','return'].map((id,i)=>({id,label:id,caption:id,narratorLine:'Synthetic',startsAtMs:i*750,durationMs:750}))}}
 const parsed=parseSelectedMemory(raw,uid,id,'synthetic-bucket');assert.equal(parsed.status,'ready')
 const descriptor={schemaVersion:'urai-owned-memory-media-playback-v1',requiresAuthorization:true,ownerId:uid,memoryId:id,receiptId:rid,kind:'video',contentType:'video/mp4',sha256:'f'.repeat(64),byteLength:16,storageGeneration:'123',sourceAuthorityHash:'c'.repeat(64),authorityHash:'d'.repeat(64),expiresAt:Date.now()+60000}
 const path='consentRecords/'+uid+'_memory_storage'
 const consent={uid,purpose:'memory.storage',consentTier:'C1',policyVersion:'1.0.0',status:'granted',receiptHash:'b'.repeat(64),expiresAt:expiry}
 const docs=new Map([
 ['users/'+uid,{accountStatus:'active'}],
 ['users/'+uid+'/memories/'+id,raw],
 ['users/'+uid+'/privacyPolicy/current',{ownerId:uid,version:2,revision:1,domains:{memory:{mode:'granted',replayVisible:true}},enforcement:{state:'fully-enforced'}}],
 ['users/'+uid+'/privacyRuntime/exportAuthority',{generation:0,pendingDeletions:{}}],
 ['users/'+uid+'/memoryMediaReceipts/'+rid,{schemaVersion:'urai-owned-memory-media-v1',ownerUid:uid,memoryId:id,receiptId:rid,kind:'video',state:'ready',sha256:descriptor.sha256,byteLength:16,contentType:'video/mp4',storageGeneration:'123',consentRevision:1,consentReceiptHash:consent.receiptHash,consentExpiresAt:expiry,deletionGeneration:0,attemptNonce:'synthetic-nonce',bucketName:'synthetic-bucket',objectPath:'synthetic-private-object'}],
 [path,consent]])
 const states=[],refs=[],effects=[],queued=[],watchers=new Set(),timers=new Map(),revoked=[]
 let si=0,ri=0,ei=0,tid=0,releases=0
 const auth={currentUser:{uid,getIdToken:async()=> 'synthetic-token'}}
 const snapshot=p=>({exists:()=>docs.has(p),data:()=>docs.get(p)})
 const modules={
  react:{useState(initial){const i=si++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}]},
   useRef(v){return refs[ri++]??={current:v}},useEffect(fn,deps){const i=ei++;if(!effects[i]||deps.some((x,j)=>x!==effects[i].deps[j]))queued.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()}})}},
  'firebase/auth':{getAuth:()=>auth,onAuthStateChanged(_a,cb){queueMicrotask(()=>cb(auth.currentUser));return()=>{}}},
  'firebase/firestore':{Timestamp,doc:(_db,...p)=>p.join('/'),onSnapshot(p,fn){const w={p,fn};watchers.add(w);queueMicrotask(()=>{if(watchers.has(w))fn(snapshot(p))});return()=>watchers.delete(w)}},
  'firebase/functions':{httpsCallable:()=>async()=>({data:{...descriptor}})},
  '@/lib/firebase/client':{app:{},firebasePublicEnvReady:true,functions:{},getFirebaseDb:()=>({})},
  './selectedMemoryContract':{parseSelectedMemory},
  './ownedMemoryMediaPlayback':{...ownedPlayback,fetchOwnedMemoryPlayback:async()=>new Blob(['synthetic'])}}
 const output={}
 const setTimer=(fn,ms)=>{const i=++tid;timers.set(i,{fn,ms});return i},clearTimer=i=>timers.delete(i)
 vm.runInNewContext(c1HookCode,{exports:output,require:n=>{assert.ok(n in modules,n);return modules[n]},AbortController,Date,Number,JSON,navigator:{onLine:true},process:{env:{NEXT_PUBLIC_FIREBASE_PROJECT_ID:'urai-4dc1d',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'synthetic-bucket'}},setTimeout:setTimer,clearTimeout:clearTimer,URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL:u=>revoked.push(u)},window:new EventTarget()})
 const render=()=>{si=ri=ei=0;const p=output.useOwnedMemoryMediaPlayback(parsed.memory,()=>releases++);while(queued.length)queued.shift()();return p}
 render();for(let i=0;i<30;i++)await Promise.resolve()
 assert.equal(render().status,'ready','the actual hook mounts under disclosed SDK/HTTP fixtures')
 return {path,consent,revoked,releaseCount:()=>releases,render,
  update(value){docs.set(path,value);for(const w of [...watchers])if(w.p===path)w.fn(snapshot(path))},
  cleanup(){for(const e of effects)e.cleanup?.()}}
}
for(const [label,change] of [
 ['C1 status revoked',c=>({...c,status:'revoked'})],
 ['C1 receipt hash replaced',c=>({...c,receiptHash:'e'.repeat(64)})],
 ['C1 expiry replaced',c=>({...c,expiresAt:Date.now()-1})]
])test('mounted private source immediately closes on '+label,async()=>{
 const h=await mountC1Playback()
 try {h.update(change(h.consent));assert.equal(h.render().status,'unavailable');assert.ok(h.revoked.length>0);assert.ok(h.releaseCount()>0)}
 finally{h.cleanup()}
})


// Late SDK settlement executes the actual hook and transport; SDK/HTTP doubles are synthetic.
function staleReleaseDeferred(){let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
async function staleReleaseDrain(){for(let i=0;i<60;i++)await Promise.resolve();}
function staleReleaseLoad(source,requireFn,extra={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:requireFn,AbortController,URL,Uint8Array,Blob,crypto:webcrypto,fetch,Response,Date,...extra});return module.exports;}
async function staleReleaseScenario(source,phase){
 const bytes=Buffer.from('synthetic hook cleanup fixture; not family media');
 const receipt={mediaReceiptId:'a'.repeat(64),kind:'audio'};
 const memory={ownerId:'owner',id:'memory',privacy:'private',authorization:'owner',sourceMediaReceipts:[receipt]};
 const descriptor={schemaVersion:'urai-owned-memory-media-playback-v1',requiresAuthorization:true,ownerId:'owner',memoryId:'memory',receiptId:receipt.mediaReceiptId,kind:'audio',contentType:'audio/wav',sha256:createHash('sha256').update(bytes).digest('hex'),byteLength:bytes.length,storageGeneration:'123',sourceAuthorityHash:'b'.repeat(64),authorityHash:'c'.repeat(64),expiresAt:Date.now()+60000};
 const pending=staleReleaseDeferred(), watches=[],timers=new Set();let effect,authCallback,tokenCalls=0,callableCalls=0,newRelease=0,oldRelease=0;
 const ref={current:null};const user={uid:'owner',getIdToken(){tokenCalls++;return phase==='token'?pending.promise:Promise.resolve('synthetic-token');}};const auth={currentUser:user};
 const consentExpiry=Date.now()+600000;
 const sourceReceipt={consentReceiptHash:'d'.repeat(64),consentExpiresAt:consentExpiry,ownerUid:'owner',memoryId:'memory',receiptId:receipt.mediaReceiptId,kind:'audio',state:'ready',consentRevision:1,deletionGeneration:0,sha256:descriptor.sha256,storageGeneration:'123',byteLength:bytes.length,contentType:'audio/wav'};
 const timerEnv={setTimeout(fn,ms){const timer={fn,ms};timers.add(timer);return timer;},clearTimeout(timer){timers.delete(timer);}};
 const transport=staleReleaseLoad(fs.readFileSync(new URL('../src/spatial/memory/ownedMemoryMediaPlayback.ts', import.meta.url),'utf8'),()=>{throw Error('transport import unexpected');},{...timerEnv,fetch:async()=>new Response(bytes,{status:200,headers:{'content-type':descriptor.contentType,'content-length':String(bytes.length),'x-urai-checksum-sha256':descriptor.sha256,'x-urai-storage-generation':'123'}})});
 const hook=staleReleaseLoad(source,id=>{
  if(id==='react')return {useRef:()=>ref,useState:()=>[{},()=>{}],useEffect:fn=>{effect=fn;}};
  if(id==='firebase/auth')return {getAuth:()=>auth,onAuthStateChanged(_auth,fn){authCallback=fn;return ()=>{};}};
  if(id==='firebase/firestore')return {Timestamp:Timestamp,doc:(_db,...parts)=>parts.join('/'),onSnapshot(path,fn){watches.push({path,fn});return ()=>{};}};
  if(id==='firebase/functions')return {httpsCallable:()=>()=>{callableCalls++;return phase==='callable'&&callableCalls===1?pending.promise:Promise.resolve({data:descriptor});}};
  if(id==='@/lib/firebase/client')return {app:{},firebasePublicEnvReady:true,functions:{},getFirebaseDb:()=>({})};
  if(id==='./selectedMemoryContract')return {parseSelectedMemory:()=>({status:'ready',memory})};
  if(id==='./ownedMemoryMediaPlayback')return transport;
  throw Error('unexpected import '+id);
 },{...timerEnv,navigator:{onLine:true},window:{addEventListener(){},removeEventListener(){}},process:{env:{NEXT_PUBLIC_FIREBASE_PROJECT_ID:'urai-4dc1d'}}});
 hook.useOwnedMemoryMediaPlayback(memory,()=>{oldRelease++;});const cleanup=effect();authCallback(user);
 for(const {path,fn}of watches){let data=sourceReceipt;if(path==='consentRecords/owner_memory_storage')data={uid:'owner',purpose:'memory.storage',consentTier:'C1',policyVersion:'1.0.0',status:'granted',receiptHash:sourceReceipt.consentReceiptHash,expiresAt:consentExpiry};else if(path.endsWith('/memories/memory'))data={};else if(path.endsWith('/privacyPolicy/current'))data={ownerId:'owner',version:2,revision:1,domains:{memory:{mode:'granted',replayVisible:true}},enforcement:{state:'fully-enforced'}};else if(path.endsWith('/privacyRuntime/exportAuthority'))data={generation:0,pendingDeletions:{}};else if(path==='users/owner')data={};fn({exists:()=>true,data:()=>data});}
 await staleReleaseDrain();assert.equal(callableCalls,1,'old mount entered actual callable wait');if(phase==='token')assert.equal(tokenCalls,1,'old mount entered actual token wait');
 cleanup();assert.equal(oldRelease,1,'initial cleanup releases old consumer once');
 hook.useOwnedMemoryMediaPlayback(memory,()=>{newRelease++;});
 await staleReleaseDrain();pending.resolve(phase==='callable'?{data:descriptor}:'synthetic-token');await staleReleaseDrain();
 return {newRelease,oldRelease,timers:timers.size};
}

for(const phase of ['callable','token']) test('obsolete private playback '+phase+' settlement preserves the newer consumer', async()=>{ const source=fs.readFileSync(new URL('../src/spatial/memory/useOwnedMemoryMediaPlayback.ts',import.meta.url),'utf8');const r=await staleReleaseScenario(source,phase);assert.equal(r.newRelease,0,JSON.stringify(r));assert.equal(r.oldRelease,1);assert.equal(r.timers,0) })
