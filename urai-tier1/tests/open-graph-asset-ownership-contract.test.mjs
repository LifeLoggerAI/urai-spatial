import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const rootPage = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8')
const lifeMapPage = readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../public/assets/urai/final/manifests/asset-factory-spatial-handoff.json', import.meta.url), 'utf8'))

const byName = new Map(manifest.assets.map((asset) => [asset.name, asset]))

function expectSocialAsset(name, canonicalPath, source, routeUrl) {
  const asset = byName.get(name)
  assert.ok(asset, `${name} must remain present in the canonical 53-asset handoff`)
  assert.equal(asset.status, 'ready')
  assert.equal(asset.canonicalPath, canonicalPath)
  assert.equal(asset.width, 1200)
  assert.equal(asset.height, 630)
  assert.match(source, new RegExp(`https://urai\\.app/${canonicalPath.replaceAll('/', '\\/')} ` .trim()))
  assert.match(source, new RegExp(`url: '${routeUrl.replaceAll('/', '\\/')}'`))
  assert.match(source, /card: 'summary_large_image'/)
  assert.match(source, /openGraph:/)
  assert.match(source, /twitter:/)
}

test('launch Open Graph asset is owned by canonical root metadata', () => {
  expectSocialAsset(
    'open_graph_launch',
    'assets/urai/social/open-graph-launch.webp',
    rootPage,
    'https://urai.app/',
  )
  assert.match(rootPage, /alt: 'URAI Spatial — open your private world'/)
})

test('Life Map Open Graph asset is owned by canonical route metadata', () => {
  expectSocialAsset(
    'open_graph_life_map',
    'assets/urai/social/open-graph-life-map.webp',
    lifeMapPage,
    'https://urai.app/life-map',
  )
  assert.match(lifeMapPage, /alt: 'URAI Life Map — step inside your private constellation'/)
})
