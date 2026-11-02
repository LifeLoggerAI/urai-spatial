import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = name => readFileSync(new URL('../src/spatial/memory/' + name, import.meta.url), 'utf8')
for(const filename of ['useSelectedMemory.ts','useOwnedMemoryMediaPlayback.ts']) {
  test(filename + ' parses and binds Auth to canonical UrAi emulator-aware client', () => {
    const source = read(filename)
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)
    assert.equal(ast.parseDiagnostics.length, 0)
    assert.match(source, /getUraiAuth\(\)/)
    assert.match(source, /onAuthStateChanged/)
    assert.doesNotMatch(source, /\bgetAuth\(app\)/)
    assert.match(source, /getFirebaseDb\(\)/)
  })
}
test('private Replay releases stale owner selection before protected byte access', () => {
  const s = read('useOwnedMemoryMediaPlayback.ts')
  assert.match(s, /auth\.currentUser === user/)
  assert.match(s, /user\.uid !== memory\.ownerId/)
  assert.match(s, /controller\.abort\(\)/)
  assert.match(s, /fetchOwnedMemoryPlayback/)
  assert.match(s, /sourceAuthorityHash/)
})
