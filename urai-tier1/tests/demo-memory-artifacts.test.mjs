import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const demoSource = readFileSync(new URL('../src/spatial/demo/demoMemoryStars.ts', import.meta.url), 'utf8')
const rendererSource = readFileSync(new URL('../src/spatial/assets/ManifestRenderer.tsx', import.meta.url), 'utf8')

const requiredDemoAssets = [
  '/demo/memories/recovery-bloom.svg',
  '/demo/memories/threshold-storm.svg',
  '/demo/memories/mirror-focus.svg',
  '/demo/memories/ritual-echo.svg',
  '/demo/memories/dream-signal.svg',
  '/demo/memories/calm-return.svg',
]

test('demo memory manifests include local public image artifacts', () => {
  assert.match(demoSource, /demoArtifactByTone/)
  assert.match(demoSource, /artifactId: `\$\{resolvedId\}-primary-demo-image`/)
  assert.match(demoSource, /mimeType: 'image\/svg\+xml'/)
  assert.match(demoSource, /width: 1440/)
  assert.match(demoSource, /height: 1440/)

  for (const asset of requiredDemoAssets) {
    assert.ok(demoSource.includes(asset), `Missing demo asset path: ${asset}`)
  }
})

test('manifest renderer allows same-origin demo public assets without allowing storage URIs', () => {
  assert.match(rendererSource, /url\.startsWith\('gs:\/\/'\)/)
  assert.match(rendererSource, /url\.startsWith\('\/demo\/'\)/)
  assert.match(rendererSource, /parsed\.protocol === 'https:' \|\| parsed\.protocol === 'http:'/)
})
