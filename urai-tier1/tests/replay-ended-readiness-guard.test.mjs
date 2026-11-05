import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/app/replay/replayMediaSession.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  fileName: 'replayMediaSession.ts', reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
assert.equal(compiled.diagnostics?.length, 0, 'original Replay transport must parse as TypeScript')
const module = { exports: {} }
vm.runInNewContext(compiled.outputText, { module, exports: module.exports }, { filename: 'replayMediaSession.ts' })
const { createReplayMediaSession } = module.exports

class SourceVideo extends EventTarget {
  duration = 15
  currentTime = 0
  readyState = 2
  paused = true
  seeking = false
  ended = false
  muted = true
  src = ''
  error = null
  load() {}
  removeAttribute(key) { if (key === 'src') this.src = '' }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')) }
  play() { this.paused = false; this.ended = false; this.dispatchEvent(new Event('playing')); return Promise.resolve() }
  emit(name) { this.dispatchEvent(new Event(name)) }
}
function fixture() {
  const video = new SourceVideo(), snapshots = []
  const controls = createReplayMediaSession(video, 'blob:isolated-source', s => snapshots.push({ ...s }))
  video.emit('loadeddata')
  const latest = () => snapshots.at(-1)
  return { video, snapshots, controls, latest }
}
function finish(f) {
  f.video.currentTime = 15
  f.video.ended = true
  f.video.paused = true
  f.video.emit('ended')
  assert.equal(f.latest().status, 'ended', 'genuine natural ending must first be observed')
}
for (const lateEvent of ['loadeddata','loadedmetadata','canplay']) {
  test(`late ${lateEvent} cannot revive completed Replay state or suppress three-segment advancement`, () => {
    const f = fixture()
    finish(f)
    f.video.emit(lateEvent)
    assert.equal(f.latest().status, 'ended', 'late decoder readiness must preserve terminal ended')
    assert.equal(f.latest().playing, false)
    assert.equal(f.latest().currentTimeMs, 15000)
    f.controls.dispose()
  })
}
test('explicit seek from completed source remains available after later decoder readiness', () => {
  const f = fixture()
  finish(f)
  f.video.ended = false
  f.controls.seek(2000)
  f.video.emit('canplay')
  assert.equal(f.latest().status, 'ready')
  assert.equal(f.latest().currentTimeMs, 2000)
  f.controls.dispose()
})
test('explicit user playback after completion still restarts the original decoder', async () => {
  const f = fixture()
  finish(f)
  await f.controls.play()
  assert.equal(f.latest().status, 'ready')
  assert.equal(f.latest().playing, true)
  assert.equal(f.video.currentTime, 0)
  f.controls.dispose()
})
