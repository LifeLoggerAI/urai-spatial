import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Deterministic local-storage and original TypeScript module behavior only.
// This never creates a real signed identity, consent grant, or cloud authorization.
function load(path, imports = {}, win = {}) {
  const module = { exports: {} }
  const code = readFileSync(new URL('../src/' + path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(code, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText
  vm.runInNewContext(compiled, {
    module, exports: module.exports, JSON, Object, Date, encodeURIComponent, window: win,
    require(id) {
      assert.ok(Object.hasOwn(imports, id), 'unhandled original source import: ' + id)
      return imports[id]
    },
  })
  return module.exports
}
function fixture() {
  const data = new Map()
  const win = { localStorage: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  }}
  const scope = load('lib/uraiStorage/ownerScope.ts', {}, win)
  const profile = load('lib/uraiAdaptive/profile.ts', {}, win)
  const tier7 = load('lib/uraiPersistence/localStore.ts',
    { '@/lib/uraiStorage/ownerScope': scope }, win)
  const tier8 = load('lib/uraiAdaptive/localStore.ts',
    { '@/lib/uraiStorage/ownerScope': scope, './profile': profile }, win)
  return { data, scope, profile, tier7, tier8 }
}
const memory = title => ({ version: 1, memories: [{ id: 'synthetic', title }] })
test('owner identity must be explicitly provided and valid', () => {
  const { scope } = fixture()
  for (const invalid of [undefined, null, '', 'bad/owner', '../owner', 'x'.repeat(129)]) {
    assert.equal(scope.resolveLegacyOwnerId(invalid), null)
    assert.equal(scope.legacyOwnerStorageKey('urai:tier7:persistence', invalid), null)
  }
  assert.equal(scope.resolveLegacyOwnerId('owner-a'), 'owner-a')
})
test('legacy unscoped records remain untouched and are never hydrated', () => {
  const { data, tier7, tier8 } = fixture()
  data.set('urai:tier7:persistence:v1', JSON.stringify(memory('unattributed')))
  data.set('urai:tier8:adaptive-profile:v1', JSON.stringify({ totalSignals: 999 }))
  assert.equal(tier7.loadUraiSnapshot('owner-a'), null)
  assert.equal(tier8.loadAdaptiveProfile('owner-a').totalSignals, 0)
  tier7.saveUraiSnapshot(memory('ignored'), undefined)
  tier8.saveAdaptiveProfile({ totalSignals: 10 }, undefined)
  tier7.clearUraiSnapshot(null)
  tier8.clearAdaptiveProfile(null)
  assert.equal(data.size, 2)
})
test('Tier 7 owner partitions enforce independent load, save and clear', () => {
  const { tier7, data } = fixture()
  tier7.saveUraiSnapshot(memory('A'), 'owner-a')
  tier7.saveUraiSnapshot(memory('B'), 'owner-b')
  assert.equal(tier7.loadUraiSnapshot('owner-a').memories[0].title, 'A')
  assert.equal(tier7.loadUraiSnapshot('owner-b').memories[0].title, 'B')
  assert.equal(tier7.loadUraiSnapshot('owner-c'), null)
  tier7.clearUraiSnapshot('owner-a')
  assert.equal(tier7.loadUraiSnapshot('owner-a'), null)
  assert.equal(tier7.loadUraiSnapshot('owner-b').memories[0].title, 'B')
  assert.equal(data.has('urai:tier7:persistence:v1'), false)
})
test('Tier 8 owner partitions enforce independent load, save and clear', () => {
  const { tier8, profile, data } = fixture()
  tier8.saveAdaptiveProfile({ ...profile.createDefaultAdaptiveProfile(), totalSignals: 4 }, 'owner-a')
  tier8.saveAdaptiveProfile({ ...profile.createDefaultAdaptiveProfile(), totalSignals: 2 }, 'owner-b')
  assert.equal(tier8.loadAdaptiveProfile('owner-a').totalSignals, 4)
  assert.equal(tier8.loadAdaptiveProfile('owner-b').totalSignals, 2)
  tier8.clearAdaptiveProfile('owner-b')
  assert.equal(tier8.loadAdaptiveProfile('owner-b').totalSignals, 0)
  assert.equal(tier8.loadAdaptiveProfile('owner-a').totalSignals, 4)
  assert.equal(data.has('urai:tier8:adaptive-profile:v1'), false)
})
test('legacy hook source defaults disabled and fences owner-epoch delayed callbacks', () => {
  const persistence = readFileSync(new URL('../src/spatial/hooks/useUraiPersistence.ts', import.meta.url), 'utf8')
  const adaptive = readFileSync(new URL('../src/spatial/hooks/useUraiAdaptiveLearning.ts', import.meta.url), 'utf8')
  for (const source of [persistence, adaptive]) {
    assert.match(source, /enabled = false/)
    assert.match(source, /resolveLegacyOwnerId\(ownerId\)/)
    assert.match(source, /scopeRef\.current\.epoch !== epoch/)
    assert.match(source, /scopeRef\.current\.ownerId !== activeOwnerId/)
  }
})
