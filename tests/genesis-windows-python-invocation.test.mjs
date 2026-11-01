import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { genesisPythonInvocation } from '../scripts/genesis-windows-python-invocation.mjs'

test('Windows uses the supported Python 3 launcher without shell execution', () => {
  assert.deepEqual(genesisPythonInvocation('win32'), { executable: 'py', prefixArgs: ['-3'] })
})
test('Linux and macOS continue to invoke python3', () => {
  for (const platform of ['linux', 'darwin'])
    assert.deepEqual(genesisPythonInvocation(platform), { executable: 'python3', prefixArgs: [] })
})
test('capture script physically invokes the existing pixel gate with selected interpreter', () => {
  const code = readFileSync(new URL('../scripts/genesis-ascent-patched-review-capture.mjs', import.meta.url), 'utf8')
  assert.match(code, /genesisPythonInvocation\(process\.platform\)/)
  assert.match(code, /exec\(python\.executable,\[\.\.\.python\.prefixArgs,/)
  assert.match(code, /genesis-ascent-pixel-gate\.py/)
  assert.match(code, /PIXEL_AND_CAMERA_PREFLIGHT_PASSED_HUMAN_REVIEW_REQUIRED/)
})
