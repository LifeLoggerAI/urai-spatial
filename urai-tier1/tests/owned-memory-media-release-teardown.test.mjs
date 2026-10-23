import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// Executes the original hook's release closure against fault-injected browser
// callbacks. No personal media, account identifiers or Firebase credentials.
const source = readFileSync(new URL('../src/spatial/memory/useOwnedMemoryMediaPlayback.ts', import.meta.url), 'utf8')
const start = source.indexOf('      const release = () => {')
const end = source.indexOf('\n      detach = release', start)
assert.ok(start >= 0 && end > start, 'original owned media cleanup must remain present')
const releaseSource = source.slice(start, end)

function runTeardown({ throwsConsumer = false, throwsStop = false } = {}) {
  const events = []
  const deps = {
    controller: { abort() { events.push('abort') } },
    stops: [() => { events.push('stop-1'); if (throwsStop) throw Error('unsubscribe failure') },
      () => events.push('stop-2')],
    finishSnapshots() { events.push('finish') },
    releaseConsumer: { current() { events.push('consumer'); if (throwsConsumer) throw Error('consumer failure') } },
    URL: { revokeObjectURL(url) { events.push('revoke:' + url) } },
  }
  // The extracted closure is JavaScript-only inside the original TS hook.
  // Execute it twice to prove real cleanup, not just a static source marker.
  const invoke = new Function('deps', `const {controller,stops,finishSnapshots,releaseConsumer,URL}=deps;
    const expiry=null,poll=null;let released=false,objectUrl='blob:synthetic-memory';
    ${releaseSource}
    release();release();return {released,objectUrl}`)
  const result = invoke(deps)
  return { events, result }
}
test('normal cleanup revokes exact owned URL once and closes all subscriptions', () => {
  const { events, result } = runTeardown()
  assert.equal(result.released, true)
  assert.equal(result.objectUrl, null)
  assert.equal(events.filter(x=>x==='revoke:blob:synthetic-memory').length, 1)
  assert.ok(events.includes('stop-2'))
})
test('consumer callback failure cannot strand previously admitted private bytes', () => {
  const { events } = runTeardown({ throwsConsumer:true })
  assert.ok(events.includes('revoke:blob:synthetic-memory'))
})
test('throwing Firestore unsubscribe cannot skip other listeners or URL revocation', () => {
  const { events } = runTeardown({ throwsStop:true })
  assert.ok(events.includes('stop-2'))
  assert.ok(events.includes('revoke:blob:synthetic-memory'))
})
test('unsubscribe failure still reaches and closes the old media consumer', () => {
  const { events } = runTeardown({ throwsStop:true })
  assert.ok(events.includes('consumer'))
})
