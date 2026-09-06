import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const rootPage = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8')
const lifeMapPage = readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../public/assets/urai/final/manifests/asset-factory-spatial-handoff.json', import.meta.url), 'utf8'))
const byName = new Map(manifest.assets.map((asset) => [asset.name, asset]))

function expectSocialAsset({ name, canonicalPath, source, routeUrl, alt }) {
  const asset = byName.get(name)
  const absoluteAssetUrl = `https://urai.app/${canonicalPath}`

  assert.ok(asset, `${name} must remain present in the canonical 53-asset handoff`)
  assert.equal(asset.status, 'ready')
  assert.equal(asset.canonicalPath, canonicalPath)
  assert.equal(asset.width, 1600)
  assert.equal(asset.height, 900)
  assert.ok(source.includes(`const ${name === 'open_graph_launch' ? 'launchSocialImage' : 'lifeMapSocialImage'} = '${absoluteAssetUrl}'`))
  assert.ok(source.includes(`canonical: '${routeUrl}'`))
  assert.ok(source.includes(`url: '${routeUrl}'`))
  assert.ok(source.includes(`alt: '${alt}'`))
  assert.match(source, /width: 1600/)
  assert.match(source, /height: 900/)
  assert.match(source, /card: 'summary_large_image'/)
  assert.match(source, /openGraph:/)
  assert.match(source, /twitter:/)
}

test('launch Open Graph asset is owned by canonical root metadata', () => {
  expectSocialAsset({
    name: 'open_graph_launch',
    canonicalPath: 'assets/urai/social/open-graph-launch.webp',
    source: rootPage,
    routeUrl: 'https://urai.app/',
    alt: 'UrAi — personal intelligence, made spatial',
  })
})

test('Life Map Open Graph asset is owned by canonical route metadata', () => {
  expectSocialAsset({
    name: 'open_graph_life_map',
    canonicalPath: 'assets/urai/social/open-graph-life-map.webp',
    source: lifeMapPage,
    routeUrl: 'https://urai.app/life-map',
    alt: 'URAI Life Map — step inside your private constellation',
  })
})
