import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const layout = read('src/app/layout.tsx')
const robots = read('src/app/robots.ts')
const sitemap = read('src/app/sitemap.ts')
const entity = JSON.parse(read('public/urai-entity.json'))

const authorityRoutes = [
  ['about', 'src/app/about/page.tsx'],
  ['about/labs', 'src/app/about/labs/page.tsx'],
  ['founder', 'src/app/founder/page.tsx'],
  ['ecosystem', 'src/app/ecosystem/page.tsx'],
  ['press', 'src/app/press/page.tsx'],
  ['contact', 'src/app/contact/page.tsx'],
]

test('root metadata preserves preview noindex without positively indexing every child route', () => {
  const rootOpenGraph = layout.match(/openGraph:\s*\{[\s\S]*?\n  \},\n  twitter:/)?.[0] ?? ''
  assert.match(layout, /previewMode \? \{ robots: \{ index: false, follow: false, noarchive: true \} \} : \{\}/)
  assert.doesNotMatch(layout, /index: true/)
  assert.ok(rootOpenGraph)
  assert.doesNotMatch(rootOpenGraph, /url:/)
})

test('robots keeps classified private and internal route families out of crawl scope', () => {
  for (const prefix of ['/admin', '/api/', '/internal/', '/invite/', '/focus/session/', '/life-map/star/', '/memory/', '/passport/', '/place/', '/replay/', '/spatial/memory/', '/u/']) {
    assert.ok(robots.includes(`'${prefix}'`), `missing robots exclusion for ${prefix}`)
  }
})

test('each authority page owns its canonical Open Graph URL', () => {
  for (const [route, sourcePath] of authorityRoutes) {
    const source = read(sourcePath)
    assert.ok(source.includes(`alternates: { canonical: 'https://urai.app/${route}' }`), `missing canonical URL for /${route}`)
    assert.ok(source.includes(`openGraph: { url: 'https://urai.app/${route}' }`), `missing Open Graph URL for /${route}`)
  }
})

test('sitemap has one canonical Home URL', () => {
  assert.match(sitemap, /const publicRoutes = \[\s*'\/'/)
  assert.doesNotMatch(sitemap, /'\/home'/)
})

test('entity registry distinguishes canonical product names from legacy technical aliases', () => {
  assert.equal(entity.entities.product.name, 'UrAi')
  assert.equal(entity.entities.product.capitalization, 'UrAi')
  assert.deepEqual(entity.entities.product.alternateNames, ['UrAi Spatial'])
  assert.deepEqual(entity.entities.product.legacyTechnicalAliases, ['URAI', 'URAI Spatial'])
  assert.equal(entity.entities.organization.name, 'URAI Labs')
  assert.equal(entity.entities.foundation.name, 'URAI Foundation')
})
