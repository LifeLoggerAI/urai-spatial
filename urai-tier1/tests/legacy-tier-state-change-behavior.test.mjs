import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { createDefaultAdaptiveProfile, resolveAdaptiveOutput, updateAdaptiveProfile } from '../src/lib/uraiAdaptive/profile.ts'

// Execute the original hooks and adaptive algorithm. React commits, timers and
// storage are deterministic doubles. This does not approve the legacy stores
// for authenticated use, owner isolation, cloud persistence or a mounted UI.
function hookHarness(path, exportName, imports) {
  const states = [], refs = [], memos = [], effects = [], timers = new Map()
  let stateIndex = 0, refIndex = 0, memoIndex = 0, effectIndex = 0, timerId = 0
  const commits = []
  const equal = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  const react = {
    useState(initial) {
      const index = stateIndex++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
    },
    useRef(initial) { return refs[refIndex++] ??= { current: initial } },
    useMemo(compute, deps) {
      const index = memoIndex++
      if (!memos[index] || !equal(memos[index].deps, deps)) memos[index] = { deps, value: compute() }
      return memos[index].value
    },
    useEffect(callback, deps) {
      const index = effectIndex++
      if (!effects[index] || !equal(effects[index].deps, deps)) commits.push(() => {
        effects[index]?.cleanup?.()
        effects[index] = { deps, cleanup: callback() }
      })
    },
  }
  const module = { exports: {} }
  const source = readFileSync(new URL('../src/' + path, import.meta.url), 'utf8')
  const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(emitted, {
    module, exports: module.exports, JSON, Object,
    require(name) {
      if (name === 'react') return react
      assert.ok(name in imports, 'unexpected original hook import: ' + name)
      return imports[name]
    },
    window: {
      setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id },
      clearTimeout(id) { timers.delete(id) },
    },
  })
  return {
    render(args) {
      stateIndex = refIndex = memoIndex = effectIndex = 0
      const result = module.exports[exportName](args)
      while (commits.length) commits.shift()()
      return result
    },
    flush() { for (const [id, callback] of [...timers]) { timers.delete(id); callback() } },
    close() { for (const effect of effects) effect?.cleanup?.() },
    pending: () => timers.size,
  }
}

const clone = value => JSON.parse(JSON.stringify(value))
function snapshot() {
  return {
    version: 1,
    session: { sessionId: 'synthetic-session', phase: 'HOME', selectedStarId: null, lastPhase: 'HOME', replayEnteredAt: 0, updatedAt: 1 },
    memories: [{ id: 'synthetic-memory', title: 'Before', memoryType: 'photo', emotionalTone: 'neutral', memoryWeight: 0.2, auraIntensity: 0.2, position: [0, 0, -4], updatedAt: 1 }],
    pattern: { dominantArc: 'mixed_field', relatedMemoryIds: [], relatedTitles: [], nextSuggestedFocusId: null, chainLine: '', systemInsight: '', updatedAt: 1 },
    companion: { mode: 'witness', presence: 0.4, suggestedAction: 'observe', confidence: 0.4, whisper: '', updatedAt: 1 },
  }
}
function persistence() {
  const writes = []
  const hook = hookHarness('spatial/hooks/useUraiPersistence.ts', 'useUraiPersistence', {
    '@/lib/uraiPersistence/localStore': { loadUraiSnapshot: () => null, saveUraiSnapshot: value => { writes.push(clone(value)) } },
    '@/lib/uraiStorage/ownerScope': { resolveLegacyOwnerId: id => id || null },
  })
  return { ...hook, writes, render: args => hook.render({ ownerId: 'synthetic-owner', enabled: true, ...args }) }
}
const snapshotChanges = [
  ['memory title', value => { value.memories[0].title = 'After' }],
  ['memory tone', value => { value.memories[0].emotionalTone = 'bright' }],
  ['memory position', value => { value.memories[0].position[0] = 7 }],
  ['memory weight', value => { value.memories[0].memoryWeight = 0.8 }],
  ['memory intensity', value => { value.memories[0].auraIntensity = 0.8 }],
  ['memory type', value => { value.memories[0].memoryType = 'video' }],
  ['memory timestamp', value => { value.memories[0].updatedAt = 2 }],
  ['session identity', value => { value.session.sessionId = 'synthetic-new-session' }],
  ['pattern relationships', value => { value.pattern.relatedTitles = ['Synthetic relation'] }],
  ['companion presence', value => { value.companion.presence = 0.9 }],
]
for (const [label, change] of snapshotChanges) test('Tier 7 saves changed ' + label + ' with unchanged memory count', () => {
  const hook = persistence(), before = snapshot()
  hook.render({ snapshot: before }); hook.flush()
  const after = clone(before); change(after)
  hook.render({ snapshot: after }); hook.flush()
  assert.equal(after.memories.length, before.memories.length)
  assert.equal(hook.writes.length, 2, 'changed snapshot must not be skipped as already saved')
  assert.deepEqual(hook.writes[1], after)
  hook.close()
})
test('Tier 7 also detects a nested edit when the snapshot reference is retained', () => {
  const hook = persistence(), value = snapshot()
  hook.render({ snapshot: value }); hook.flush()
  value.memories[0].title = 'Mutated synthetic title'
  hook.render({ snapshot: value }); hook.flush()
  assert.equal(hook.writes.length, 2)
  assert.equal(hook.writes[1].memories[0].title, value.memories[0].title)
  hook.close()
})
test('Tier 7 identical snapshot does not duplicate storage writes', () => {
  const hook = persistence(), value = snapshot()
  hook.render({ snapshot: value }); hook.flush()
  hook.render({ snapshot: clone(value) }); hook.flush()
  assert.equal(hook.writes.length, 1)
  hook.close()
})
test('Tier 7 debounce stores only the latest pending snapshot and cleanup cancels it', () => {
  const hook = persistence(), before = snapshot(), after = snapshot()
  after.memories[0].title = 'Latest'
  hook.render({ snapshot: before }); hook.render({ snapshot: after })
  assert.equal(hook.pending(), 1); hook.flush()
  assert.deepEqual(hook.writes, [after])
  hook.render({ snapshot: before }); hook.close(); hook.flush()
  assert.equal(hook.writes.length, 1)
})

function signal() {
  return { phase: 'FOCUS', selectedMemoryType: 'photo', selectedTone: 'neutral', dominantArc: 'mixed_field', companionMode: 'witness', companionAction: 'observe', memoryWeight: 0.2, auraIntensity: 0.2, timestamp: 1 }
}
function adaptive() {
  const writes = []
  const hook = hookHarness('spatial/hooks/useUraiAdaptiveLearning.ts', 'useUraiAdaptiveLearning', {
    '@/lib/uraiAdaptive/localStore': { loadAdaptiveProfile: createDefaultAdaptiveProfile, saveAdaptiveProfile: value => { writes.push(clone(value)) } },
    '@/lib/uraiAdaptive/profile': { createDefaultAdaptiveProfile, resolveAdaptiveOutput, updateAdaptiveProfile },
    '@/lib/uraiStorage/ownerScope': { resolveLegacyOwnerId: id => id || null },
  })
  return { ...hook, writes, render: args => hook.render({ ownerId: 'synthetic-owner', enabled: true, ...args }) }
}
for (const field of ['memoryWeight', 'auraIntensity']) test('Tier 8 applies changed ' + field + ' without a phase or tone change', () => {
  const hook = adaptive(), before = signal()
  hook.render({ signal: before }); hook.flush()
  const after = { ...before, [field]: 0.8 }
  hook.render({ signal: after }); hook.flush()
  const output = hook.render({ signal: after })
  assert.equal(hook.writes.length, 2)
  assert.equal(output.profile.preferredNarratorTempo, 'slow')
  assert.equal(output.profile.totalSignals, 2)
  hook.close()
})
test('Tier 8 distinguishes a later signal event with identical content', () => {
  const hook = adaptive(), before = signal(), after = { ...signal(), timestamp: 2 }
  hook.render({ signal: before }); hook.flush()
  hook.render({ signal: after }); hook.flush()
  assert.equal(hook.writes.length, 2)
  assert.equal(hook.writes[1].updatedAt, 2)
  assert.equal(hook.writes[1].totalSignals, 2)
  hook.close()
})
test('Tier 8 detects in-place intensity changes as well as immutable updates', () => {
  const hook = adaptive(), value = signal()
  hook.render({ signal: value }); hook.flush()
  value.auraIntensity = 0.8
  hook.render({ signal: value }); hook.flush()
  assert.equal(hook.writes.length, 2)
  assert.equal(hook.writes[1].preferredNarratorTempo, 'slow')
  hook.close()
})
test('Tier 8 identical event does not count twice and disabled/unmounted work stays canceled', () => {
  const hook = adaptive(), value = signal()
  hook.render({ signal: value }); hook.flush()
  hook.render({ signal: clone(value) }); hook.flush()
  assert.equal(hook.writes.length, 1)
  hook.render({ signal: { ...value, timestamp: 2 }, enabled: false }); hook.flush()
  assert.equal(hook.writes.length, 1)
  hook.render({ signal: { ...value, timestamp: 3 } }); hook.close(); hook.flush()
  assert.equal(hook.writes.length, 1)
})
