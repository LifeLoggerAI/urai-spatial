import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')
const appRoot = path.join(repoRoot, 'urai-tier1/src/app')
const manifestPath = path.join(repoRoot, 'release/route-manifest.json')

test('every publicExact route has a concrete App Router page owner', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const publicExact = manifest?.classification?.publicExact
  assert.ok(Array.isArray(publicExact), 'release manifest must define classification.publicExact')

  const missing = publicExact.filter((route) => {
    assert.equal(typeof route, 'string', 'publicExact entries must be strings')
    assert.match(route, /^\//, `publicExact route must be absolute: ${route}`)
    const relative = route === '/' ? 'page.tsx' : path.join(route.slice(1), 'page.tsx')
    return !fs.existsSync(path.join(appRoot, relative))
  })

  assert.deepEqual(
    missing,
    [],
    `publicExact routes must not outrun source ownership; missing page owners: ${missing.join(', ')}`,
  )
})
