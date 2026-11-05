import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const middleware = readFileSync(join(root, 'src/middleware.ts'), 'utf8')
const approved = [
  'recovery-bloom.svg',
  'threshold-storm.svg',
  'mirror-focus.svg',
  'ritual-echo.svg',
  'dream-signal.svg',
  'calm-return.svg',
]

test('production middleware lists exactly the six reviewed public demo memory SVGs', () => {
  const block = middleware.match(/const APPROVED_DEMO_MEMORY_ASSETS = new Set\(\[([\s\S]*?)\]\)/)
  assert.ok(block, 'reviewed demo asset allowlist is missing')
  const paths = [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
  assert.equal(paths.length, approved.length, 'asset allowlist must be exact, not a prefix')
  assert.deepEqual([...paths].sort(), approved.map((name) => `/demo/memories/${name}`).sort())
  for (const name of approved) assert.ok(existsSync(join(root, 'public/demo/memories', name)), `missing real asset: ${name}`)
})

test('production middleware still denies nonallowlisted demo routes', () => {
  assert.match(middleware, /if \(APPROVED_DEMO_MEMORY_ASSETS\.has\(pathname\)\) return true/)
  assert.match(middleware, /if \(pathname\.startsWith\('\/demo'\)\) \{/)
  assert.match(middleware, /NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES, process\.env\.URAI_ALLOW_PUBLIC_DEMO_ROUTES/)
  assert.doesNotMatch(middleware, /pathname\.startsWith\('\/demo\/memories'\)\) return true/)
  assert.match(middleware, /NextResponse\.rewrite\(new URL\('\/_not-found', request\.url\), \{ status: 404 \}\)/)
})
