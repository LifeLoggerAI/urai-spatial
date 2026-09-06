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
const privacyAlias = read('src/app/privacy/page.tsx')
const privacyControls = read('src/app/privacy-controls/page.tsx')
const llms = read('public/llms.txt')
const entity = JSON.parse(read('public/urai-entity.json'))
const publicClaims = JSON.parse(read('public/urai-public-claims.json'))
const chrisAuthority = read('../docs/PUBLIC_FOOTPRINT_CHRIS_HERRIN.md')
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

const indexedProductRoutes = [
  ['ground', 'src/app/ground/page.tsx'],
  ['focus', 'src/app/focus/page.tsx'],
  ['passport', 'src/app/passport/page.tsx'],
  ['privacy-controls', 'src/app/privacy-controls/page.tsx'],
  ['status', 'src/app/status/page.tsx'],
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
    const openGraph = source.match(/openGraph:\s*\{[\s\S]*?\n  \},/)?.[0] ?? ''
    assert.ok(openGraph.includes(`url: 'https://urai.app/${route}/'`), `missing Open Graph URL for /${route}`)
    assert.match(openGraph, /title:/, `missing Open Graph title for /${route}`)
    assert.match(openGraph, /description:/, `missing Open Graph description for /${route}`)
    assert.match(openGraph, /siteName: 'UrAi'/, `missing Open Graph site name for /${route}`)
  }
})

test('indexable product routes own route-specific Open Graph and Twitter metadata', () => {
  for (const [route, sourcePath] of indexedProductRoutes) {
    const source = read(sourcePath)
    assert.ok(source.includes(`alternates: { canonical: 'https://urai.app/${route}/' }`), `missing canonical URL for /${route}`)
    const openGraph = source.match(/openGraph:\s*\{[\s\S]*?\n  \},/)?.[0] ?? ''
    const twitter = source.match(/twitter:\s*\{[\s\S]*?\n  \},/)?.[0] ?? ''
    assert.ok(openGraph.includes(`url: 'https://urai.app/${route}/'`), `missing Open Graph URL for /${route}`)
    assert.match(openGraph, /title,/, `missing route-owned Open Graph title for /${route}`)
    assert.match(openGraph, /description,/, `missing route-owned Open Graph description for /${route}`)
    assert.match(openGraph, /siteName: 'UrAi'/, `missing Open Graph site name for /${route}`)
    assert.match(twitter, /card: 'summary'/, `missing safe route-owned Twitter card for /${route}`)
    assert.match(twitter, /title,/, `missing route-owned Twitter title for /${route}`)
    assert.match(twitter, /description,/, `missing route-owned Twitter description for /${route}`)
    assert.doesNotMatch(twitter, /summary_large_image/, `/${route} must not inherit the homepage large-image card without a route-owned image`)
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

test('privacy compatibility alias stays noindex and points at the canonical controls route', () => {
  assert.doesNotMatch(privacyAlias, /publicIndexing/)
  assert.match(privacyAlias, /robots:\s*\{\s*index: false,\s*follow: true,\s*noarchive: true,/)
  assert.match(privacyAlias, /alternates: \{ canonical: 'https:\/\/urai\.app\/privacy-controls\/' \}/)
  assert.match(privacyAlias, /redirect\('\/privacy-controls\/\?from=privacy'\)/)
})

test('privacy controls and llms discovery links publish final canonical URLs', () => {
  assert.match(privacyControls, /alternates: \{ canonical: 'https:\/\/urai\.app\/privacy-controls\/' \}/)
  assert.match(privacyControls, /openGraph:\s*\{[\s\S]*url: 'https:\/\/urai\.app\/privacy-controls\/'/)

  for (const route of ['about/', 'about/labs/', 'founder/', 'ecosystem/', 'press/', 'status/']) {
    assert.ok(llms.includes(`https://urai.app/${route}`), `llms.txt missing canonical URL for /${route}`)
  }
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
  assert.equal(entity.entities.foundingEngineer.name, 'Chris Herrin')
  assert.equal(entity.entities.foundingEngineer.role, 'Founding Engineer')
  assert.equal(entity.entities.foundingEngineer.canonicalUrl, 'https://urai.app/about/labs/#chris-herrin')
  assert.deepEqual(entity.entities.foundingEngineer.externalProfiles, [])
  assert.doesNotMatch(JSON.stringify(entity.entities.foundingEngineer), /linkedin\.com|sameAs/i)
  assert.equal(entity.entities.foundation.name, 'URAI Foundation')
  assert.equal(entity.entities.foundation.canonicalUrl, 'https://github.com/LifeLoggerAI/urai-foundation')
  assert.equal(entity.entities.foundation.publicDomainTarget, 'https://uraifoundation.org/')
  assert.match(entity.entities.foundation.publicDomainStatus, /unverified/)
})

test('public authority publishes Chris Herrin as Founding Engineer and rejects superseded Lead Engineer authority', () => {
  const labs = read('src/app/about/labs/page.tsx')
  const about = read('src/app/about/page.tsx')
  const press = read('src/app/press/page.tsx')
  const claimsText = JSON.stringify(publicClaims)
  for (const source of [labs, about, press, llms, chrisAuthority, JSON.stringify(entity), claimsText]) {
    assert.match(source, /Founding Engineer/)
    assert.doesNotMatch(source, /Lead Engineer/)
  }
  assert.match(labs, /Chris Herrin/)
  assert.match(labs, /id="chris-herrin"/)
  assert.match(labs, /application\/ld\+json/)
  assert.ok(llms.includes('Founding Engineer: Chris Herrin'))
  assert.match(labs, /legal co-founder status/)
  assert.doesNotMatch(labs, /linkedin\.com/)
  assert.doesNotMatch(llms, /linkedin\.com/)
})
