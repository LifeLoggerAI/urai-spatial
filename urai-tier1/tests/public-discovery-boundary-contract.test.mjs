import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const layout = read('src/app/layout.tsx')
const robots = read('src/app/robots.ts')
const sitemap = read('src/app/sitemap.ts')
const publicIndexing = read('src/app/public-indexing.ts')
const entity = JSON.parse(read('public/urai-entity.json'))

const authorityRoutes = [
  ['about', 'src/app/about/page.tsx'],
  ['about/labs', 'src/app/about/labs/page.tsx'],
  ['founder', 'src/app/founder/page.tsx'],
  ['ecosystem', 'src/app/ecosystem/page.tsx'],
  ['press', 'src/app/press/page.tsx'],
  ['contact', 'src/app/contact/page.tsx'],
]

test('root metadata denies indexing by default and production public routes opt in explicitly', () => {
  const rootOpenGraph = layout.match(/openGraph:\s*\{[\s\S]*?\n  \},\n  twitter:/)?.[0] ?? ''
  assert.match(layout, /robots:\s*\{\s*index: false,\s*follow: false,/)
  assert.match(publicIndexing, /NEXT_PUBLIC_URAI_PREVIEW_MODE/)
  assert.match(publicIndexing, /previewMode/)
  assert.match(publicIndexing, /index: false/)
  assert.match(publicIndexing, /index: true/)
  assert.doesNotMatch(layout, /index: true/)
  assert.ok(rootOpenGraph)
  assert.doesNotMatch(rootOpenGraph, /url:/)

  for (const [, sourcePath] of authorityRoutes) {
    assert.match(read(sourcePath), /robots: publicIndexing/)
  }
})

test('robots lets crawlers observe per-route noindex metadata', () => {
  assert.match(robots, /allow:/)
  assert.doesNotMatch(robots, /disallow:/)
})

test('each authority page owns its canonical Open Graph URL', () => {
  for (const [route, sourcePath] of authorityRoutes) {
    const source = read(sourcePath)
    assert.ok(source.includes(`alternates: { canonical: 'https://urai.app/${route}' }`), `missing canonical URL for /${route}`)
    assert.ok(source.includes(`openGraph: { url: 'https://urai.app/${route}' }`), `missing Open Graph URL for /${route}`)
  }
})

test('sitemap has one Home URL and exported trailing-slash canonicals', () => {
  assert.match(sitemap, /const publicRoutes = \[\s*'\/'/)
  assert.doesNotMatch(sitemap, /'\/home'/)
})

test('entity registry distinguishes canonical product names from current and legacy technical aliases', () => {
  assert.equal(entity.entities.product.name, 'UrAi')
  assert.equal(entity.entities.product.capitalization, 'UrAi')
  assert.equal(entity.entities.product.alternateNames, undefined)
  assert.deepEqual(entity.entities.product.currentTechnicalAliases, ['URAI'])
  assert.deepEqual(entity.entities.product.legacyTechnicalAliases, ['URAI Spatial'])
  assert.equal(entity.entities.organization.name, 'URAI Labs')
  assert.equal(entity.entities.foundation.name, 'URAI Foundation')
  assert.equal(entity.entities.foundation.canonicalUrl, 'https://github.com/LifeLoggerAI/urai-foundation')
  assert.equal(entity.entities.foundation.publicDomainTarget, 'https://uraifoundation.org/')
  assert.match(entity.entities.foundation.publicDomainStatus, /unverified/)
})
