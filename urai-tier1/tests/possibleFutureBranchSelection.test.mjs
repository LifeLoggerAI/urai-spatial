import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
const ts = createRequire(import.meta.url)('typescript')
const source = fs.readFileSync(new URL('../src/lib/scenario/possibleFutureBranchSelection.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
}, reportDiagnostics: true })
assert.deepEqual(output.diagnostics ?? [], [], 'Source must transpile')
const { resolvePossibleFutureBranchIndex: pick } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(output.outputText))
const a = 'br_AAAAAAAAAAAA', b = 'br_BBBBBBBBBBBB', c = 'br_CCCCCCCCCCCC'
const ids = [a,b,c]
test('opaque spatial branch ID selects its exact current Scenario branch', () => {
  assert.equal(pick(b, ids), 1)
  assert.equal(pick(c, ids), 2)
  assert.equal(pick(a, ids), 0)
})
test('the previous implementation Number(branch) would lose opaque IDs', () => {
  assert.ok(Number.isNaN(Number(b)))
  assert.equal(pick(b, ids), 1)
})
test('a missing opaque ID must not silently attach a different outcome report', () => {
  assert.equal(pick('br_DDDDDDDDDDDD', ids), null)
})
test('out-of-range numeric selections must not choose another branch', () => {
  assert.equal(pick('3', ids), null)
  assert.equal(pick('2', ids.slice(0,2)), null)
  assert.equal(pick('99999999999999999999', ids), null)
})
test('canonical numeric links retain compatibility', () => {
  assert.equal(pick('0', ids), 0)
  assert.equal(pick('1', ids), 1)
  assert.equal(pick('2', ids), 2)
})
test('malformed numeric input and arbitrary strings cannot select branches', () => {
  for (const value of ['01','+1',' 1','1 ','1e0','-1','1.0','foo']) assert.equal(pick(value, ids), null)
})
test('without URL selection, preserve a valid current branch or safely use first', () => {
  assert.equal(pick(null, ids,2),2)
  assert.equal(pick('', ids,1),1)
  assert.equal(pick(null, ids,99),0)
  assert.equal(pick(null,[],0),0)
})
test('a specific branch requires loaded branch records, not just a URL', () => {
  assert.equal(pick(b, []),null)
  assert.equal(pick('1', []),null)
})
test('malformed or repeated server branch IDs fail closed', () => {
  assert.equal(pick(a,['x',b]),null)
  assert.equal(pick(a,[a,a]),null)
})
test('never select beyond the three-branch Scenario limit', () => {
  const four=[...ids,'br_DDDDDDDDDDDD']
  assert.equal(pick(four[3],four),null)
  assert.equal(pick('3',four),null)
})
