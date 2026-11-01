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


test('Windows source checkout pin includes its own Python inspection fix, not an older recorder', () => {
  const checkout = readFileSync(new URL('../scripts/genesis-windows-exact-checkout.sh', import.meta.url), 'utf8')
  const runbook = readFileSync(new URL('../docs/GENESIS_WINDOWS_EXACT_SOURCE_CAPTURE_HOLD.md', import.meta.url), 'utf8')
  const camera = readFileSync(new URL('../scripts/genesis-ascent-patched-review-capture.mjs', import.meta.url), 'utf8')
  const pinned = 'ae6e8bcf75f5d1804c78afea40e586afaadae10d'
  assert.match(checkout, new RegExp("PINNED_SHA='" + pinned + "'"))
  assert.ok(runbook.includes(pinned), 'runbook must match immutable checkout pin')
  assert.ok(runbook.includes("--source-sha '" + pinned + "'"), 'recording must use matching corrected checkout')
  assert.match(checkout, /verify_blob '7097e80c2365d3818e06710bb5ac391d4f9a09cf' 'scripts\/genesis-ascent-patched-review-capture\.mjs'/)
  assert.match(camera, /genesisPythonInvocation\(process\.platform\)/)
  assert.match(camera, /exec\(python\.executable,\[\.\.\.python\.prefixArgs,/)
  assert.doesNotMatch(camera, /exec\('python3',\[/)
})
