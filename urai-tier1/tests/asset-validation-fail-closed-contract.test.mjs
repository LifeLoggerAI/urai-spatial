import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(path.join(process.cwd(), 'scripts/validate-assets.mjs'), 'utf8')

test('ready and fallback assets require regular committed files', () => {
  assert.match(source, /asset\.status === 'ready' \|\| asset\.status === 'fallback'/)
  assert.match(source, /stats\.isFile\(\) && !symbolicLink && realPathInsidePublic/)
  assert.match(source, /requiredFile && \(!pathInsidePublic \|\| !exists \|\| !regularFile\)/)
  assert.match(source, /missingRequiredFiles/)
  assert.match(source, /nonRegularRequiredFiles/)
})

test('asset paths remain lexically and physically inside the public root', () => {
  assert.match(source, /const publicRoot = resolve\(appRoot, 'public'\)/)
  assert.match(source, /const canonicalPublicRoot = realpathSync\(publicRoot\)/)
  assert.match(source, /realPath = realpathSync\(abs\)/)
  assert.match(source, /realPath\.startsWith\(`\$\{canonicalPublicRoot\}\$\{sep\}`\)/)
  assert.match(source, /lexicalPathInsidePublic && \(!exists \|\| realPathInsidePublic\)/)
  assert.match(source, /outside-public-root/)
})

test('manifest paths are normalized before collision detection', () => {
  assert.match(source, /function normalizeManifestPath\(value\)/)
  assert.match(source, /replace\(\/\\\\\/g, '\/'\)/)
  assert.match(source, /posix\.normalize\(withoutLeadingSlash\)/)
  assert.match(source, /seenPaths\.has\(normalizedPath\.normalized\)/)
  assert.match(source, /duplicatePaths\.add\(normalizedPath\.normalized\)/)
})

test('manifest identity and normalized path collisions fail the gate', () => {
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
