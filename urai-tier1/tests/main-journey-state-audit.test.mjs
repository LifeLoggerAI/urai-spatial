import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../..', import.meta.url))
const auditSource = fs.readFileSync(path.join(root, 'scripts/audit-main-journey-state.mjs'), 'utf8')
const focusPath = 'urai-tier1/src/app/focus/FocusChamberClient.tsx'
const replayPath = 'urai-tier1/src/app/replay/CinematicReplayClient.tsx'

function runAudit(mutation) {
  const processFixture = { cwd: () => root, exitCode: undefined }
  let receipt
  const readFileSync = (file, encoding) => {
    const source = fs.readFileSync(file, encoding)
    if (!mutation || file !== path.join(root, mutation.path)) return source
    assert.ok(source.includes(mutation.before), 'mutation must alter actual current source')
    return mutation.all ? source.replaceAll(mutation.before, mutation.after) : source.replace(mutation.before, mutation.after)
  }
  vm.runInNewContext(auditSource.replace(/^import .*$/gm, ''), {
    readFileSync, join: path.join, process: processFixture,
    console: { log: value => { receipt = JSON.parse(value) } },
  })
  return {receipt, exitCode:processFixture.exitCode}
}

test('actual complete journey audit accepts the current localized selected-memory action', () => {
  const {receipt, exitCode} = runAudit()
  assert.equal(receipt.ok, true)
  assert.deepEqual(receipt.failures, [])
  assert.deepEqual(receipt.requiredState, ['memoryId','manifestId','node','movieId','chapterId'])
  assert.equal(exitCode, undefined)
})

for (const mutation of [
  {label:'private title interpolation', path:focusPath, before:"{title:memory.title}", after:"{title:'Generic memory'}", failure:'Focus Replay portal accessibility'},
  {label:'scoped localized name', path:focusPath, before:"aria-label={memory ? locale.text('focus.openReplayFor', {title:memory.title}) : locale.text('focus.chooseReplay')}", after:'aria-label="Open Replay"', failure:'Focus Replay portal accessibility'},
  {label:'matching locale metadata', path:focusPath, before:"{...locale.props(memory ? 'focus.openReplayFor' : 'focus.chooseReplay')}", after:'lang="ar" dir="rtl"', failure:'Focus Replay portal locale metadata'},
  {label:'selected-memory visibility', path:focusPath, before:'{memory ? <button type="button" className="primary"', after:'{true ? <button type="button" className="primary"', failure:'Focus Replay portal selected-memory visibility'},
  {label:'single primary action', path:focusPath, before:'<nav className="focusControls"', after:'<nav className="focusControls"><button className="primary">Duplicate</button>', failure:'Focus must expose exactly one primary Replay action.'},
  {label:'committed disabled state', path:focusPath, before:'disabled={committed}', after:'disabled={false}', failure:'Focus Replay portal committed state'},
  {label:'travel click owner', path:focusPath, before:'onClick={enterReplay} {...locale.props', after:'onClick={unwind} {...locale.props', failure:'Focus Replay portal travel owner'},
  {label:'authorization guard', path:focusPath, before:'if (!memory || !replayHref || committed) return', after:'if (committed) return', failure:'Focus must fail closed without an authorized memory and Replay route.'},
  {label:'selected manifest travel identity', path:focusPath, before:'manifestId: memory.replayManifest.id, node:', after:"manifestId: 'foreign-manifest', node:", failure:'Focus forwards complete selected identity'},
  {label:'Replay authentication', path:replayPath, before:'useSelectedMemory()', after:'useFixtureMemory()', failure:'Replay authenticated memory authority'},
  {label:'Replay reduced motion', path:replayPath, before:'const reducedMotion = useReducedMotion()', after:'const reducedMotion = false', all:true, failure:'Replay honors reduced motion'},
  {label:'manifest mismatch denial', path:'urai-tier1/src/spatial/memory/useSelectedMemory.ts', before:'parsed.memory.replayManifest.id !== manifestId', after:'false', failure:'Selected-memory manifest identity check'},
  {label:'movie travel identity', path:'urai-tier1/src/app/life-movie/LifeMovieClient.tsx', before:'movieId: requestedMovieId', after:"movieId: 'other-movie'", failure:'Life Movie preserves movie identity'},
  {label:'Replay hard navigation', path:replayPath, before:'requestUraiWorldReturn()', after:'window.location.assign("/home")', failure:'Replay client: forbidden hardcoded pattern'},
]) {
  test(`actual journey audit rejects loss of ${mutation.label}`, () => {
    const {receipt, exitCode} = runAudit(mutation)
    assert.equal(receipt.ok, false)
    assert.equal(exitCode, 1)
    assert.ok(receipt.failures.some(failure => failure.includes(mutation.failure)), JSON.stringify(receipt.failures))
  })
}
