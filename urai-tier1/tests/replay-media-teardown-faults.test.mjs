import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Fault-injection only; never use personal-memory media as a test fixture.
const file = new URL('../src/app/replay/replayMediaSession.ts', import.meta.url)
const text = fs.readFileSync(file, 'utf8')
const compiled = ts.transpileModule(text, { fileName: 'replayMediaSession.ts', reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
assert.equal(compiled.diagnostics?.length || 0, 0)
const exportsObj = {}, sandboxModule = {exports: exportsObj}
vm.runInNewContext(compiled.outputText, { module: sandboxModule, exports: exportsObj, Error, Number, Math, Map }, { filename: 'replayMediaSession.ts' })
const { createReplayMediaSession } = sandboxModule.exports

class Media extends EventTarget {
  constructor() { super(); this.duration = 10; this.readyState = 4; this.currentTime = 0; this.seeking = false; this.ended = false;
    this.error = null; this.muted = true; this.paused = true; this.src = ''; this.preload=''; this.loop = false;
    this.loadCalls=0; this.pauseCalls=0; this.removedListeners=0; this.throwRemove=false; this.throwPause=false; this.throwRemoveSource=false; }
  load() { this.loadCalls++; }
  play() { this.paused = false; this.dispatchEvent(new Event('playing')); return Promise.resolve() }
  pause() { this.pauseCalls++; if (this.throwPause) throw new Error('pause failed'); this.paused = true; }
  removeAttribute(name) { if (this.throwRemoveSource) throw new Error('remove source failed'); if (name==='src') this.src=''; }
  removeEventListener(type, listener, opts) { if (this.throwRemove && type==='loadedmetadata') throw new Error('detachment failed');
    super.removeEventListener(type,listener,opts); this.removedListeners++; }
}
const open = async () => { const media = new Media(), snapshots=[];
  const session = createReplayMediaSession(media,'blob:private-owner-memory', snapshot=>snapshots.push(snapshot));
  await session.play(); assert.equal(media.paused, false); assert.equal(media.src,'blob:private-owner-memory');
  return {media,session,snapshots}; }

test('Replay disposal survives injected event-listener teardown failure', async () => {
  const {media,session} = await open(); media.throwRemove=true
  assert.doesNotThrow(()=>session.dispose())
  assert.equal(media.paused,true)
  assert.equal(media.src,'')
  assert.ok(media.loadCalls>=2)
})
test('Replay event removal failure must not skip other listeners or allow late media activity',async()=>{
  const {media,session,snapshots} = await open(); media.throwRemove=true; const before=snapshots.length
  session.dispose(); media.dispatchEvent(new Event('playing'));media.dispatchEvent(new Event('timeupdate'));
  assert.equal(media.paused,true);assert.equal(media.src,'');assert.ok(media.removedListeners>1)
  assert.equal(snapshots.length,before)
})
test('Replay pause error still detaches URL and live event callbacks',async()=>{
  const {media,session}=await open();media.throwPause=true
  assert.doesNotThrow(()=>session.dispose())
  assert.equal(media.muted,true)
  assert.equal(media.src,'')
  assert.ok(media.loadCalls>=2)
  assert.ok(media.removedListeners>1)
})
test('Replay source reset failure still runs load and cleans up listeners',async()=>{
  const {media,session}=await open();media.throwRemoveSource=true
  assert.doesNotThrow(()=>session.dispose())
  assert.equal(media.src,'')
  assert.ok(media.loadCalls>=2)
  assert.ok(media.removedListeners>1)
})
