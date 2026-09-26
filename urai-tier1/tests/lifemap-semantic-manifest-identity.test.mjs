import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const callback = source.match(/const withIdentity = useCallback\(\(next: URLSearchParams\) => \{([\s\S]*?)\n  \}, \[explicitDemo, params\]\)/)
assert.ok(callback, 'test must exercise the actual semantic identity callback')
const code = ts.transpile(`(next: URLSearchParams) => {${callback[1]}\n}`, { target: ts.ScriptTarget.ES2022 })

function select(search) {
  const params = new URLSearchParams(search)
  const withIdentity = vm.runInNewContext(code, { params, explicitDemo: params.get('demo') === '1' })
  const next = withIdentity(new URLSearchParams())
  next.set('memoryId', 'quiet-reset')
  next.set('node', 'quiet-reset')
  return next
}

test('keyboard selection from Home without a manifest commits complete canonical identity', () => {
  const next = select('demo=1')
  assert.equal(next.get('manifestId'), 'replay-recovery-thread')
  assert.equal(next.get('demo'), '1')
  assert.equal(next.get('memoryId'), next.get('node'))
})

test('explicit manifest is preserved without copying unrelated private parameters', () => {
  const next = select('manifestId=owned-manifest&token=private&demo=0')
  assert.equal(next.get('manifestId'), 'owned-manifest')
  assert.equal(next.has('token'), false)
  assert.equal(next.has('demo'), false)
})
