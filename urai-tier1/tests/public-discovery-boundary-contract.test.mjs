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
const staticHosting = JSON.parse(read('../firebase.static.json'))

function evaluateSitemap() {
  const executable = sitemap
    .replace(/^import type .*\n/m, '')
    .replace(/ as const/g, '')
    .replace(/export const dynamic = 'force-static'/, "const dynamic = 'force-static'")
    .replace(/export default function sitemap\(\): MetadataRoute\.Sitemap/, 'function sitemap()')
  return new Function(`${executable}\nreturn sitemap();`)()
}

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

test('robots lets crawlers observe per-route noindex metadata while exported APIs use response headers', () => {
  assert.match(robots, /allow:/)
  assert.doesNotMatch(robots, /disallow:/)
  const apiRule = staticHosting.hosting.headers.find((entry) => entry.source === '/api/**')
  assert.ok(apiRule)
  assert.ok(apiRule.headers.some((header) => header.key === 'X-Robots-Tag' && /noindex/.test(header.value)))
})

test('each authority page owns its canonical Open Graph URL', () => {
  for (const [route, sourcePath] of authorityRoutes) {
    const source = read(sourcePath)
    assert.ok(source.includes(`alternates: { canonical: 'https://urai.app/${route}/' }`), `missing canonical URL for /${route}`)
    assert.ok(source.includes(`openGraph: { url: 'https://urai.app/${route}/' }`), `missing Open Graph URL for /${route}`)
  }
})

test('sitemap has one Home URL, excludes redirect aliases, and matches exported trailing-slash canonicals', () => {
  const entries = evaluateSitemap()
  const urls = entries.map((entry) => entry.url)
  assert.equal(urls.filter((url) => url === 'https://urai.app/').length, 1)
  assert.ok(urls.every((url) => url.endsWith('/')))
  assert.ok(!urls.includes('https://urai.app/home/'))
  assert.ok(!urls.includes('https://urai.app/privacy/'))
})

test('entity registry distinguishes canonical product names from current and legacy technical aliases', () => {
  assert.equal(entity.entities.product.name, 'UrAi')
  assert.equal(entity.entities.product.capitalization, 'UrAi')
  assert.equal(entity.entities.product.alternateNames, undefined)
  assert.deepEqual(entity.entities.product.currentTechnicalAliases, ['URAI', 'URAI Spatial'])
  assert.deepEqual(entity.entities.product.legacyTechnicalAliases, [])
  assert.equal(entity.entities.organization.name, 'URAI Labs')
  assert.equal(entity.entities.organization.canonicalUrl, 'https://urai.app/about/labs/')
  assert.equal(entity.entities.founder.canonicalUrl, 'https://urai.app/founder/')
  assert.equal(entity.entities.founder.publicProfile, 'https://urai.app/founder/')
  assert.equal(entity.entities.foundation.name, 'URAI Foundation')
  assert.equal(entity.entities.foundation.canonicalUrl, 'https://github.com/LifeLoggerAI/urai-foundation')
  assert.equal(entity.entities.foundation.publicDomainTarget, 'https://uraifoundation.org/')
  assert.match(entity.entities.foundation.publicDomainStatus, /unverified/)
})
