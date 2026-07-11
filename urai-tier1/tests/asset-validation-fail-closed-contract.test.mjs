import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(path.join(process.cwd(), 'scripts/validate-assets.mjs'), 'utf8')

test('ready and fallback assets require regular committed files', () => {
  assert.match(source, /asset\.status === 'ready' \|\| asset\.status === 'fallback'/)
  assert.match(source, /stats\.isFile\(\) && !symbolicLink/)
  assert.match(source, /requiredFile && \(!pathInsidePublic \|\| !exists \|\| !regularFile\)/)
  assert.match(source, /missingRequiredFiles/)
  assert.match(source, /nonRegularRequiredFiles/)
})

test('asset paths remain inside the public root', () => {
  assert.match(source, /const publicRoot = resolve\(appRoot, 'public'\)/)
  assert.match(source, /abs\.startsWith\(`\$\{publicRoot\}\$\{sep\}`\)/)
  assert.match(source, /invalidPaths/)
  assert.match(source, /outside-public-root/)
})

test('manifest identity and path collisions fail the gate', () => {
  assert.match(source, /duplicateIds/)
  assert.match(source, /duplicatePaths/)
  assert.match(source, /summary\.duplicateIds > 0/)
  assert.match(source, /summary\.duplicatePaths > 0/)
})

test('invalid extensions and every fail-closed condition exit nonzero', () => {
  assert.match(source, /summary\.invalidExtensions > 0/)
  assert.match(source, /summary\.blocking > 0/)
  assert.match(source, /if \(failed\) process\.exit\(1\)/)
})
